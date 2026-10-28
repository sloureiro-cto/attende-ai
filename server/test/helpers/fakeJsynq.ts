import { randomBytes } from 'crypto';
import express from 'express';
import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { WebSocket, WebSocketServer } from 'ws';
import { FakeCrm } from './fakeJsynqCrm';
import { AUTH_SECRET } from './tokens';

const oid = () => randomBytes(12).toString('hex');

type Agent = { id: string; workspaceId: string; name: string; description: string; systemPrompt: string; isActive: boolean; body: Record<string, unknown> };
type Binding = {
  _id: string;
  workspaceId: string;
  agentId: string;
  channel: string;
  sessionId: string;
  targetType: string;
  targetId?: string | null;
  status: 'active' | 'paused' | 'completed';
  policy: Record<string, unknown>;
};
/** A socket of the fake `/ws` endpoint: its room and the user its token (query or handshake) proved. */
type FakeSocket = { ws: WebSocket; room: string; userId: string | null; handshakes: number };
type User = { id: string; email: string; name: string; verified: boolean; language?: string };
type Workspace = { _id: string; name: string; owner: string; members: string[]; createdAt: string; language?: string; businessHours?: unknown };

/** The platform tools JSYNQ seeds in every workspace's registry (`provider: 'jsynq'`). Only the ones the tests use. */
const PLATFORM_TOOLS = [
  { toolId: 'jsynq:search_knowledge_base', toolName: 'search_knowledge_base', provider: 'jsynq' },
  { toolId: 'jsynq:request_human_handoff', toolName: 'request_human_handoff', provider: 'jsynq' },
  { toolId: 'jsynq:search_knowledge_base_v0', toolName: 'search_knowledge_base_legacy', provider: 'jsynq' },
];

/**
 * In-memory stand-in for the JSYNQ HTTP API as it is on `origin/staging` (no partner API): the
 * public signup routes, and the user routes this service calls with a user JWT (workspace from the
 * `workspaceId` claim, or the URL where JSYNQ takes it from there). Only what the tests need.
 */
export class FakeJsynq {
  users = new Map<string, User>();
  /** Signup OTPs JSYNQ e-mailed, by e-mail (the tests read them as the user would from the inbox). */
  otps = new Map<string, string>();
  workspaces = new Map<string, Workspace>();
  projects: Array<{ _id: string; workspaceId: string; title: string; projectType: { title: string }; columns: string[]; tabs?: Array<{ boardId: string; boardType: string; order: number }> }> = [];
  pendingInvites = new Map<string, number>();
  sessions: Array<{ _id: string; workspaceId: string; channel: 'whatsapp' | 'sms' | 'instagram'; status: string; label?: string; deletedAt?: string | null }> = [];
  agents = new Map<string, Agent>();
  bindings = new Map<string, Binding>();
  documents = new Map<string, { workspaceId: string; name: string }>();
  /** CRM boards, cards, contacts and the inbox (funnel and reports). */
  crm = new FakeCrm();
  calls: string[] = [];
  /** Make the next matching call fail: `{ 'POST /api/workspaces': 500 }`. */
  failures: Record<string, number> = {};
  private server: Server | null = null;
  private wss: WebSocketServer | null = null;
  /** Open sockets of the fake websocket (`/ws?room=&token=`). */
  sockets: FakeSocket[] = [];
  /** Upgrades refused (bad token). */
  refusedSockets = 0;
  /** While true, `broadcast` drops events (as JSYNQ's relay does when no socket is there to get them). */
  muteSockets = false;
  url = '';

  get wsUrl() {
    return `${this.url.replace(/^http/, 'ws')}/ws`;
  }

  /** What JSYNQ's `publishMessagingInboxWsBroadcast` does: every authenticated member socket of the room gets it. */
  broadcast(workspaceId: string, type: string, payload: Record<string, unknown>) {
    if (this.muteSockets) return;
    const room = `messaging-inbox:${workspaceId}`;
    const ws = this.workspaces.get(workspaceId);
    for (const s of this.sockets) {
      if (s.room !== room || !s.userId || !ws?.members.includes(s.userId) || s.ws.readyState !== WebSocket.OPEN) continue;
      s.ws.send(JSON.stringify({ type, payload }));
    }
  }

  /** Kills every socket as a network drop would (clients reconnect). */
  dropSockets() {
    for (const s of this.sockets) s.ws.terminate();
  }

  private verify(token: string | null | undefined): string | null {
    try {
      return (jwt.verify(token ?? '', AUTH_SECRET, { algorithms: ['HS256'] }) as { id: string }).id;
    } catch {
      return null;
    }
  }

  reset() {
    for (const m of [this.users, this.otps, this.workspaces, this.pendingInvites, this.agents, this.bindings, this.documents]) m.clear();
    this.projects = [];
    this.sessions = [];
    this.crm.reset();
    this.calls = [];
    this.failures = {};
    this.muteSockets = false;
    this.refusedSockets = 0;
    // `crm.reset()` cleared the hook.
    if (this.wss) this.installBroadcastHook();
  }

  addUser(email: string, opts: { verified?: boolean; id?: string } = {}) {
    const id = opts.id ?? oid();
    this.users.set(id, { id, email, name: 'Existing', verified: opts.verified ?? true });
    return id;
  }

  addWorkspace(owner: string, members: string[] = []) {
    const _id = oid();
    this.workspaces.set(_id, { _id, name: 'ws', owner, members: [owner, ...members], createdAt: new Date().toISOString() });
    return _id;
  }

  addSession(workspaceId: string, channel: 'whatsapp' | 'sms' | 'instagram' = 'whatsapp', status = 'connected') {
    const _id = oid();
    this.sessions.push({ _id, workspaceId, channel, status, label: 'Main' });
    return _id;
  }

  /** What JSYNQ's signup e-mail would carry for this address. */
  otpOf(email: string): string {
    const otp = this.otps.get(email);
    if (!otp) throw new Error(`no JSYNQ OTP for ${email}`);
    return otp;
  }

  private newOtp(email: string) {
    const otp = String(100000 + (randomBytes(3).readUIntBE(0, 3) % 900000));
    this.otps.set(email, otp);
  }

  private loginSummary(u: User) {
    const ws = [...this.workspaces.values()].find((w) => w.members.includes(u.id));
    return { id: u.id, email: u.email, name: u.name, image: null, onboarded: false, isVerified: u.verified, twoFactorEnabled: true, workspaceId: ws?._id ?? null };
  }

  async start() {
    const app = express();
    app.use((req, _res, next) => {
      this.calls.push(`${req.method} ${req.path}`);
      next();
    });
    app.use((req, res, next) => {
      const key = `${req.method} ${req.path}`;
      const status = this.failures[key];
      if (status) {
        delete this.failures[key];
        return res.status(status).json({ error: true, code: status, message: 'injected failure' });
      }
      return next();
    });
    app.use(express.json());
    this.publicRoutes(app);
    this.userRoutes(app);
    await new Promise<void>((resolve) => {
      this.server = app.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = this.server!.address() as { port: number };
    this.url = `http://127.0.0.1:${addr.port}`;
    this.startSockets();
    return this;
  }

  /** JSYNQ's `WebSocketSyncServer` on `/ws`: `room` and `token` query params, then a `handshake` message with the token. */
  private startSockets() {
    this.wss = new WebSocketServer({
      server: this.server!,
      path: '/ws',
      verifyClient: (info, cb) => {
        const url = new URL(info.req.url ?? '/', 'http://fake');
        const token = url.searchParams.get('token');
        // JSYNQ refuses an upgrade only for a token that does not verify (an anonymous socket may handshake later).
        if (token && !this.verify(token)) {
          this.refusedSockets += 1;
          return cb(false, 401, 'Unauthorized');
        }
        return cb(true);
      },
    });
    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url ?? '/', 'http://fake');
      const room = url.searchParams.get('room') ?? '';
      if (!room) return ws.close(1008, 'room not provided');
      const socket: FakeSocket = { ws, room, userId: this.verify(url.searchParams.get('token')), handshakes: 0 };
      this.sockets.push(socket);
      ws.on('message', (data) => {
        try {
          const m = JSON.parse(String(data)) as { type?: string; payload?: { token?: string } };
          if (m.type === 'handshake') {
            socket.handshakes += 1;
            const id = this.verify(m.payload?.token);
            if (id) socket.userId = id;
          }
        } catch {
          /* ignore */
        }
      });
      ws.on('close', () => {
        this.sockets = this.sockets.filter((s) => s !== socket);
      });
    });
    this.installBroadcastHook();
  }

  /** New messages in the fake inbox reach the room like JSYNQ's notifications do. */
  private installBroadcastHook() {
    this.crm.onMessage = (c, m) => {
      if (m.direction === 'inbound') {
        this.broadcast(c.workspaceId, 'messaging-inbox:new-inbound-message', {
          workspaceId: c.workspaceId,
          channel: c.channel,
          sessionId: c.sessionId,
          conversationId: c._id,
          messageId: m._id,
          lastInboundAt: m.createdAt,
          lastMessageAt: m.createdAt,
          lastMessagePreview: (m.content ?? '').slice(0, 40),
          lastMessageDirection: 'inbound',
        });
      } else {
        this.broadcast(c.workspaceId, 'messaging-inbox:conversation-last-message-updated', {
          workspaceId: c.workspaceId,
          channel: c.channel,
          sessionId: c.sessionId,
          conversationId: c._id,
          messageId: m._id,
          lastMessageStatus: 'sent',
          lastMessagePreview: (m.content ?? '').slice(0, 40),
          lastMessageDirection: 'outbound',
          lastMessageAt: m.createdAt,
        });
      }
    };
  }

  async stop() {
    for (const s of this.sockets) s.ws.terminate();
    await new Promise<void>((resolve) => (this.wss ? this.wss.close(() => resolve()) : resolve()));
    await new Promise<void>((resolve) => this.server?.close(() => resolve()));
  }

  /** `POST /api/users`, `PATCH /api/users/verify-otp`, `POST /api/verification-otps` (no credential), as on staging. */
  private publicRoutes(app: express.Express) {
    const byEmail = (email: string) => [...this.users.values()].find((u) => u.email === email);
    app.post('/api/users', (req, res) => {
      const { name, email, password, language } = req.body ?? {};
      if (typeof name !== 'string' || typeof email !== 'string') return res.status(422).json({ error: true, code: 422, message: 'Invalid body' });
      if (typeof password !== 'string' || password.length < 6 || !/\d/.test(password) || !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return res.status(422).json({ error: true, code: 422, message: 'Password must contain at least one special character.' });
      }
      if (language !== undefined && !['english', 'portuguese', 'spanish'].includes(language)) return res.status(422).json({ error: true, code: 422, message: 'Language must be one of: english, portuguese, spanish' });
      if (byEmail(email)) return res.status(400).json({ error: true, code: 400, message: 'E-mail address already in use' });
      const id = oid();
      this.users.set(id, { id, email, name, verified: false, language });
      this.newOtp(email);
      return res.status(201).json({ message: 'Your account has been created' });
    });
    app.patch('/api/users/verify-otp', (req, res) => {
      const { identifier, otp } = req.body ?? {};
      if (typeof identifier !== 'string' || typeof otp !== 'string' || !/^\d{6,}$/.test(otp)) return res.status(422).json({ error: true, code: 422, message: 'invalid body.' });
      const stored = this.otps.get(identifier);
      if (!stored) return res.status(404).json({ error: true, code: 404, message: 'verification OTP not found' });
      if (stored !== otp) return res.status(400).json({ error: true, code: 400, message: 'invalid verification OTP' });
      const user = byEmail(identifier);
      if (!user) return res.status(404).json({ error: true, code: 404, message: 'user not found' });
      user.verified = true;
      this.otps.delete(identifier);
      return res.json(this.loginSummary(user));
    });
    app.post('/api/verification-otps', (req, res) => {
      const user = byEmail(req.body?.identifier);
      if (!user) return res.status(404).json({ error: true, code: 404, message: 'User not found' });
      this.newOtp(user.email);
      return res.status(201).send();
    });
  }

  private userRoutes(app: express.Express) {
    const auth: express.RequestHandler = (req, res, next) => {
      const token = /^Bearer (.+)$/.exec(req.header('authorization') ?? '')?.[1];
      try {
        const claims = jwt.verify(token ?? '', AUTH_SECRET, { algorithms: ['HS256'] }) as { id: string; workspaceId?: string };
        res.locals.user = claims;
        return next();
      } catch {
        return res.status(401).json({ error: true, code: 401, message: 'Unauthorized' });
      }
    };
    const member = (workspaceId: string | undefined, userId: string) => {
      const ws = workspaceId ? this.workspaces.get(workspaceId) : undefined;
      return ws && ws.members.includes(userId) ? ws : null;
    };
    const scoped: express.RequestHandler = (_req, res, next) => {
      const { id, workspaceId } = res.locals.user as { id: string; workspaceId?: string };
      const ws = workspaceId ? this.workspaces.get(workspaceId) : undefined;
      if (!ws) return res.status(400).json({ error: true, code: 400, message: 'Workspace context is missing' });
      if (!ws.members.includes(id)) return res.status(403).json({ error: true, code: 403, message: 'Access denied' });
      res.locals.ws = workspaceId;
      return next();
    };
    const r = express.Router();
    r.use(auth);

    // --- workspaces -------------------------------------------------------------------------
    r.post('/workspaces', (req, res) => {
      if (typeof req.body?.name !== 'string') return res.status(422).json({ error: true, code: 422, message: "'name' is missing from body" });
      const owner = res.locals.user.id as string;
      const _id = oid();
      const ws: Workspace = { _id, name: req.body.name, owner, members: [owner], createdAt: new Date().toISOString(), language: req.body.language };
      this.workspaces.set(_id, ws);
      // JSYNQ seeds its own default agent in every new workspace: it must not count as an Attende agent.
      const seeded = oid();
      this.agents.set(seeded, { id: seeded, workspaceId: _id, name: 'JSYNQ', description: '', systemPrompt: 'default', isActive: true, body: {} });
      return res.json({ workspace: { ...ws, owner }, status: true });
    });
    r.get('/workspaces/check-owner', (_req, res) =>
      res.json({ status: true, workspaces: [...this.workspaces.values()].filter((w) => w.owner === res.locals.user.id) })
    );
    r.get('/workspaces/:id/mcp-tools', (req, res) => {
      const search = String(req.query.search ?? '');
      const provider = req.query.provider ? String(req.query.provider) : undefined;
      const rows = PLATFORM_TOOLS.filter((t) => (!search || t.toolName.includes(search)) && (!provider || t.provider === provider));
      return res.json({ success: true, data: rows, meta: { total: rows.length } });
    });
    r.get('/workspaces/:id', (req, res) => {
      const ws = member(req.params.id, res.locals.user.id);
      if (!ws) return res.status(403).json({ message: 'You do not have access to this workspace' });
      return res.json({ status: true, workspace: { _id: ws._id, name: ws.name, owner: { _id: ws.owner }, members: ws.members.map((m) => ({ _id: m })), businessHours: ws.businessHours ?? null } });
    });
    r.delete('/workspaces/:id', (req, res) => {
      if (!member(req.params.id, res.locals.user.id)) return res.status(403).json({ message: 'You do not have access to this workspace' });
      this.workspaces.delete(req.params.id);
      return res.json({ status: true });
    });
    r.get('/roles/workspaces/:id', (_req, res) => res.json({ status: true, roles: [] }));
    r.get('/invites/workspaces', scoped, (req, res) => {
      const total = req.query.status === 'pending' ? (this.pendingInvites.get(res.locals.ws) ?? 0) : 0;
      return res.json({ invites: [], pagination: { total, page: 1, limit: 1, totalPages: total } });
    });

    // --- projects ---------------------------------------------------------------------------
    r.get('/projects', scoped, (_req, res) =>
      res.json({ status: true, total: 0, projects: this.projects.filter((p) => p.workspaceId === res.locals.ws).map(({ _id, title, projectType, tabs }) => ({ _id, title, projectType, tabs: tabs ?? [] })) })
    );
    r.post('/projects', scoped, (req, res) => {
      const b = req.body ?? {};
      if (typeof b.title !== 'string' || typeof b.private !== 'boolean') return res.status(422).json({ error: true, code: 422, message: "missing field 'title'" });
      if (this.projects.some((p) => p.workspaceId === res.locals.ws && p.title === b.title)) return res.status(400).json({ error: true, code: 400, message: 'Title already exists' });
      const type = b.projectType?.title ?? 'kanban';
      const project = { _id: oid(), workspaceId: res.locals.ws, title: b.title, projectType: { title: type }, columns: type === 'crm' ? ['Lead', 'Qualified', 'Won', 'Lost'] : ['To do'] };
      this.projects.push(project);
      return res.json({ status: true, project: { _id: project._id, title: project.title, projectType: project.projectType } });
    });

    // --- agents -----------------------------------------------------------------------------
    r.post('/agents', scoped, (req, res) => {
      const b = req.body as Record<string, unknown>;
      if (!b.name || !b.systemPrompt || !b.modelConfig) return res.status(500).json({ error: true, code: 500, message: 'Failed to create agent configuration' });
      const id = oid();
      this.agents.set(id, { id, workspaceId: res.locals.ws, name: String(b.name), description: String(b.description ?? ''), systemPrompt: String(b.systemPrompt), isActive: true, body: b });
      return res.status(201).json({ success: true, data: { id, name: b.name, systemPrompt: b.systemPrompt, isActive: true } });
    });
    r.get('/agents', scoped, (_req, res) =>
      res.json({ success: true, data: [...this.agents.values()].filter((a) => a.workspaceId === res.locals.ws && a.isActive), meta: {} })
    );
    r.get('/agents/:id', scoped, (req, res) => {
      const a = this.agents.get(String(req.params.id));
      if (!a || a.workspaceId !== res.locals.ws) return res.status(404).json({ error: true, code: 404, message: 'Agent not found' });
      return res.json({ success: true, data: a });
    });
    r.patch('/agents/:id', scoped, (req, res) => {
      const a = this.agents.get(String(req.params.id));
      if (!a || a.workspaceId !== res.locals.ws) return res.status(404).json({ error: true, code: 404, message: 'Agent not found' });
      Object.assign(a, req.body);
      return res.json({ success: true, data: a });
    });
    r.delete('/agents/:id', scoped, (req, res) => {
      const a = this.agents.get(String(req.params.id));
      if (!a || a.workspaceId !== res.locals.ws) return res.status(404).json({ error: true, code: 404, message: 'Agent not found' });
      a.isActive = false;
      return res.json({ success: true, message: 'Agent deleted successfully' });
    });

    // --- automation bindings ----------------------------------------------------------------
    const binding = (req: express.Request, res: express.Response) => {
      const b = this.bindings.get(req.params.id!);
      return b && b.workspaceId === res.locals.ws ? b : null;
    };
    r.post('/automation-bindings', scoped, (req, res) => {
      const b = req.body as Binding;
      const session = this.sessions.find((s) => s._id === b.sessionId && s.workspaceId === res.locals.ws);
      if (!session) return res.status(400).json({ error: true, code: 400, message: 'Session not found in this workspace' });
      if (!b.channel || !b.targetType || !(b as { mode?: string }).mode) return res.status(400).json({ error: true, code: 400, message: 'channel, targetType and mode are required' });
      const _id = oid();
      const row: Binding = {
        _id,
        workspaceId: res.locals.ws,
        agentId: b.agentId,
        channel: b.channel,
        sessionId: b.sessionId,
        targetType: b.targetType,
        targetId: b.targetId ?? null,
        status: 'active',
        policy: b.policy,
      };
      this.bindings.set(_id, row);
      return res.status(201).json({ success: true, data: row });
    });
    r.get('/automation-bindings', scoped, (_req, res) => res.json({ success: true, data: [...this.bindings.values()].filter((b) => b.workspaceId === res.locals.ws), meta: {} }));
    r.patch('/automation-bindings/:id', scoped, (req, res) => {
      const b = binding(req, res);
      if (!b) return res.status(404).json({ error: true, code: 404, message: 'Binding not found' });
      if (req.body.policy) b.policy = req.body.policy;
      return res.json({ success: true, data: b });
    });
    r.post('/automation-bindings/:id/pause', scoped, (req, res) => {
      const b = binding(req, res);
      if (!b || b.status !== 'active') return res.status(404).json({ error: true, code: 404, message: 'Binding not found or not active' });
      b.status = 'paused';
      return res.json({ success: true, data: b });
    });
    r.post('/automation-bindings/:id/resume', scoped, (req, res) => {
      const b = binding(req, res);
      if (!b || b.status !== 'paused') return res.status(404).json({ error: true, code: 404, message: 'Binding not found or not paused' });
      b.status = 'active';
      return res.json({ success: true, data: b });
    });
    r.delete('/automation-bindings/:id', scoped, (req, res) => {
      const b = binding(req, res);
      if (!b) return res.status(404).json({ error: true, code: 404, message: 'Binding not found' });
      this.bindings.delete(b._id);
      return res.json({ success: true, message: 'Binding deleted' });
    });

    // --- channels ---------------------------------------------------------------------------
    for (const channel of ['whatsapp', 'sms', 'instagram'] as const) {
      r.get(`/${channel}-lite/sessions`, scoped, (_req, res) =>
        res.json({ success: true, data: this.sessions.filter((s) => s.workspaceId === res.locals.ws && s.channel === channel) })
      );
    }

    // --- knowledge --------------------------------------------------------------------------
    const upload = multer({ storage: multer.memoryStorage() });
    r.post('/workspace-knowledge/documents/upload', scoped, upload.single('file') as never, (req, res) => {
      const file = (req as unknown as { file?: { originalname: string } }).file;
      if (!file) return res.status(500).json({ error: true, code: 500, message: 'File is required' });
      const _id = oid();
      this.documents.set(_id, { workspaceId: res.locals.ws, name: file.originalname });
      return res.json({ status: true, document: { _id, name: file.originalname } });
    });
    r.get('/workspace-knowledge/sources', scoped, (req, res) => {
      const ids = String(req.query.refIds ?? '').split(',').filter(Boolean);
      const mine = [...this.documents.entries()].filter(([, d]) => d.workspaceId === res.locals.ws).map(([id]) => id);
      const pick = ids.length ? ids.filter((id) => mine.includes(id)) : mine;
      return res.json({ success: true, data: { items: pick.map((id) => ({ id: oid(), refId: id, status: 'ready', pageCount: 2 })) } });
    });
    r.delete('/documents/:id', scoped, (req, res) => {
      this.documents.delete(String(req.params.id));
      return res.json({ message: 'Document deleted successfully' });
    });
    this.crm.install(r, scoped);
    app.use('/api', r);
  }
}
