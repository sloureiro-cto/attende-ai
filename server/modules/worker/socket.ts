import 'server-only';
import WebSocket from 'ws';
import { errMessage, log } from '../../lib/logger';

/** What JSYNQ broadcasts in `messaging-inbox:<workspaceId>` (src/modules/messaging/notifications on origin/staging). */
export const INBOX_EVENTS = {
  newInbound: 'messaging-inbox:new-inbound-message',
  lastMessageUpdated: 'messaging-inbox:conversation-last-message-updated',
  conversationUpdated: 'messaging-inbox:conversation-updated',
  conversationRead: 'messaging-inbox:conversation-read',
  sessionStatus: 'messaging-inbox:session-status',
} as const;

export type InboxSocketMessage = { type: string; payload: Record<string, unknown> };

export type InboxSocketOptions = {
  /** JSYNQ websocket endpoint, e.g. `wss://api.example.com/ws`. */
  url: string;
  workspaceId: string;
  /** A fresh server-minted token (1 h) per connect and per refresh. Null = nobody to act as: retry later. */
  token: () => Promise<string | null>;
  onMessage: (message: InboxSocketMessage) => void;
  /** Called after every (re)connect: the caller runs the catch-up poll for what was missed meanwhile. */
  onOpen?: () => void;
  /** Re-handshake with a new token this often (before the 1 h token expires). */
  refreshMs?: number;
  minBackoffMs?: number;
  maxBackoffMs?: number;
};

/**
 * One workspace's `messaging-inbox:<workspaceId>` room, as the JSYNQ web app joins it (`hooks/useMessagingInboxSocket`):
 * `GET <url>?room=messaging-inbox:<w>&token=<jwt>` (JSYNQ decodes the token at the upgrade), then a
 * `{type: 'handshake', payload: {token, room}}` message (JSYNQ verifies it and stamps the socket's user, which its
 * per-event ACL check reads). Reconnects with exponential backoff (1 s .. 30 s, jittered) and re-handshakes with a
 * fresh token every `refreshMs`. The token is never logged (the URL is not logged either).
 */
export class InboxSocket {
  private ws: WebSocket | null = null;
  private stopped = false;
  private attempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  connected = false;
  lastMessageAt: Date | null = null;

  constructor(private readonly opts: InboxSocketOptions) {}

  get room() {
    return `messaging-inbox:${this.opts.workspaceId}`;
  }

  start() {
    this.stopped = false;
    void this.connect();
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.reconnectTimer = null;
    this.refreshTimer = null;
    const ws = this.ws;
    this.ws = null;
    this.connected = false;
    if (ws) {
      ws.removeAllListeners();
      ws.on('error', () => undefined);
      ws.terminate();
    }
  }

  private scheduleReconnect() {
    if (this.stopped || this.reconnectTimer) return;
    const min = this.opts.minBackoffMs ?? 1000;
    const max = this.opts.maxBackoffMs ?? 30_000;
    const base = Math.min(min * 2 ** this.attempts, max);
    const delay = Math.round(base / 2 + Math.random() * (base / 2));
    this.attempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
    this.reconnectTimer.unref?.();
  }

  private async connect() {
    if (this.stopped) return;
    let token: string | null;
    try {
      token = await this.opts.token();
    } catch (error) {
      log.warn('worker.socket_token_failed', { workspaceId: this.opts.workspaceId, error: errMessage(error) });
      token = null;
    }
    if (this.stopped) return;
    if (!token) return this.scheduleReconnect();
    const url = new URL(this.opts.url);
    url.searchParams.set('room', this.room);
    url.searchParams.set('token', token);
    const ws = new WebSocket(url.toString(), { handshakeTimeout: 15_000 });
    this.ws = ws;

    ws.on('open', () => {
      if (this.ws !== ws) return;
      this.attempts = 0;
      this.connected = true;
      ws.send(JSON.stringify({ type: 'handshake', payload: { token, room: this.room } }));
      if (this.refreshTimer) clearInterval(this.refreshTimer);
      this.refreshTimer = setInterval(() => void this.refreshToken(), this.opts.refreshMs ?? 45 * 60_000);
      this.refreshTimer.unref?.();
      log.info('worker.socket_open', { workspaceId: this.opts.workspaceId });
      this.opts.onOpen?.();
    });
    ws.on('message', (data) => {
      this.lastMessageAt = new Date();
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(data));
      } catch {
        return;
      }
      const m = parsed as { type?: unknown; payload?: unknown };
      if (typeof m?.type !== 'string' || !m.payload || typeof m.payload !== 'object') return;
      try {
        this.opts.onMessage({ type: m.type, payload: m.payload as Record<string, unknown> });
      } catch (error) {
        log.warn('worker.socket_handler_failed', { workspaceId: this.opts.workspaceId, type: m.type, error: errMessage(error) });
      }
    });
    ws.on('error', (error) => {
      log.warn('worker.socket_error', { workspaceId: this.opts.workspaceId, error: errMessage(error) });
    });
    ws.on('close', (code) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.connected = false;
      if (this.refreshTimer) clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      if (this.stopped) return;
      log.warn('worker.socket_closed', { workspaceId: this.opts.workspaceId, code });
      this.scheduleReconnect();
    });
  }

  /** A new handshake replaces the socket's identity before the old token expires (JSYNQ re-verifies it). */
  private async refreshToken() {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      const token = await this.opts.token();
      if (token && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'handshake', payload: { token, room: this.room } }));
    } catch (error) {
      log.warn('worker.socket_refresh_failed', { workspaceId: this.opts.workspaceId, error: errMessage(error) });
    }
  }

  /** Test seam / admin: drop the connection as if the network did (it reconnects). */
  dropForTest() {
    this.ws?.terminate();
  }
}
