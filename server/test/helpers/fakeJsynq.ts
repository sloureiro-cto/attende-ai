import { randomBytes } from 'crypto';
import express from 'express';
import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { AUTH_SECRET } from './tokens';

const oid = () => randomBytes(12).toString('hex');
export const PARTNER_KEY = 'pk_test_partner_key';

type Agent = { id: string; workspaceId: string; name: string; description: string; systemPrompt: string; isActive: boolean; body: Record<string, unknown> };
type Binding = { _id: string; workspaceId: string; agentId: string; channel: string; sessionId: string; status: 'active' | 'paused' | 'completed'; policy: Record<string, unknown> };

/**
 * In-memory stand-in for the JSYNQ HTTP API: the user routes this service calls (JWT, workspace
 * from the `workspaceId` claim) and the partner API (partner key). Only what the tests need.
 */
export class FakeJsynq {
  users = new Map<string, { id: string; email: string; name: string; managed: boolean }>();
  workspaces = new Map<string, { _id: string; name: string; owner: string; members: string[]; idempotencyKey?: string; features?: Record<string, boolean>; businessHours?: unknown }>();
  sessions: Array<{ _id: string; workspaceId: string; channel: 'whatsapp' | 'sms' | 'instagram'; status: string; label?: string }> = [];
  agents = new Map<string, Agent>();
  bindings = new Map<string, Binding>();
  documents = new Map<string, { workspaceId: string; name: string }>();
  limits = new Map<string, Record<string, unknown> & { version: number }>();
  webhookEndpoints: Array<{ id: string; url: string; events: string[]; status: string }> = [];
  /** Partner inbound routing per workspace (P4b). */
  inboundRouting = new Map<string, { url: string | null; sessions: Array<{ channel: string; sessionId: string }> }>();
  /** Conversation context served by `GET .../context`, by conversation id. */
  conversations = new Map<string, { contactName?: string; contactPhone?: string; linkedCardId?: string; vars: Record<string, string> }>();
  /** Every conversation action that ran (replays excluded), with its Idempotency-Key. */
  actions: Array<{ method: string; path: string; body: Record<string, unknown>; key?: string }> = [];
  private idempotency = new Map<string, { hash: string; status: number; body: unknown }>();
  calls: string[] = [];
  /** Make the next matching call fail: `{ 'POST /api/partner/v1/workspaces': 500 }`. */
  failures: Record<string, number> = {};
  private server: Server | null = null;
  url = '';

  reset() {
    for (const m of [this.users, this.workspaces, this.agents, this.bindings, this.documents, this.limits]) m.clear();
    this.sessions = [];
    this.webhookEndpoints = [];
    this.inboundRouting.clear();
    this.conversations.clear();
    this.actions = [];
    this.idempotency.clear();
    this.calls = [];
    this.failures = {};
  }

  addWorkspace(owner: string, members: string[] = []) {
    const _id = oid();
    this.workspaces.set(_id, { _id, name: 'ws', owner, members: [owner, ...members] });
    return _id;
  }

  addSession(workspaceId: string, channel: 'whatsapp' | 'sms' | 'instagram' = 'whatsapp', status = 'connected') {
    const _id = oid();
    this.sessions.push({ _id, workspaceId, channel, status, label: 'Main' });
    return _id;
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
    this.partnerRoutes(app);
    this.userRoutes(app);
    await new Promise<void>((resolve) => {
      this.server = app.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = this.server!.address() as { port: number };
    this.url = `http://127.0.0.1:${addr.port}`;
    return this;
  }

  async stop() {
    await new Promise<void>((resolve) => this.server?.close(() => resolve()));
  }

  private partnerRoutes(app: express.Express) {
    const r = express.Router();
    r.use((req, res, next) => (req.header('authorization') === `Bearer ${PARTNER_KEY}` ? next() : res.status(401).json({ error: true, code: 401, reference: 'PARTNER_KEY_INVALID' })));
    r.post('/users', (req, res) => {
      const existing = [...this.users.values()].find((u) => u.email === req.body.email);
      if (existing && !existing.managed) return res.status(409).json({ error: true, code: 409, message: 'exists', reference: 'USER_EXISTS_UNMANAGED' });
      if (existing) return res.status(200).json({ userId: existing.id, created: false });
      const id = oid();
      this.users.set(id, { id, email: req.body.email, name: req.body.name, managed: true });
      return res.status(201).json({ userId: id, created: true });
    });
    r.post('/users/:userId/login-token', (req, res) => {
      const u = this.users.get(req.params.userId);
      if (!u?.managed) return res.status(404).json({ error: true, code: 404, reference: 'USER_NOT_FOUND' });
      const ws = [...this.workspaces.values()].find((w) => w.owner === u.id);
      const workspaceId = ws?._id ?? null;
      const accessToken = jwt.sign({ id: u.id, email: u.email, name: u.name, workspaceId }, AUTH_SECRET, { algorithm: 'HS256', expiresIn: 86400 });
      return res.json({ id: u.id, email: u.email, name: u.name, image: null, onboarded: false, isVerified: true, twoFactorEnabled: false, workspaceId, accessToken, expiresIn: 86400 });
    });
    r.post('/workspaces', (req, res) => {
      const replay = [...this.workspaces.values()].find((w) => w.idempotencyKey === req.body.idempotencyKey);
      if (replay) return res.status(200).json({ workspaceId: replay._id, created: false });
      const _id = oid();
      this.workspaces.set(_id, { _id, name: req.body.name, owner: req.body.ownerUserId, members: [req.body.ownerUserId], idempotencyKey: req.body.idempotencyKey });
      return res.status(201).json({ workspaceId: _id, created: true, crmProjectId: oid() });
    });
    r.delete('/workspaces/:id', (req, res) => {
      if (!this.workspaces.delete(req.params.id)) return res.status(404).json({ error: true, code: 404, reference: 'WORKSPACE_NOT_FOUND' });
      return res.status(204).send();
    });
    r.put('/workspaces/:id/limits', (req, res) => {
      if (!this.workspaces.has(req.params.id)) return res.status(404).json({ error: true, code: 404, reference: 'WORKSPACE_NOT_FOUND' });
      const version = (this.limits.get(req.params.id)?.version ?? 0) + 1;
      const doc = { ...req.body, version, updatedAt: new Date().toISOString(), outboundUsed: 0 };
      this.limits.set(req.params.id, doc);
      return res.set('ETag', `"${version}"`).json(doc);
    });
    r.get('/workspaces/:id/limits', (req, res) => {
      if (!this.workspaces.has(req.params.id)) return res.status(404).json({ error: true, code: 404, reference: 'WORKSPACE_NOT_FOUND' });
      const doc = this.limits.get(req.params.id);
      return doc ? res.json(doc) : res.status(404).json({ error: true, code: 404, reference: 'LIMITS_NOT_FOUND' });
    });
    r.get('/workspaces/:id/usage', (req, res) =>
      res.json({
        month: new Date().toISOString().slice(0, 7),
        meters: { aiReplies: 3, outboundMessages: 2 },
        live: { messagingChannels: this.sessions.filter((s) => s.workspaceId === req.params.id).length, agents: 2, knowledgeDocuments: 0, members: 1 },
        limits: this.limits.get(req.params.id) ?? null,
      })
    );
    r.patch('/workspaces/:id/features', (req, res) => {
      const ws = this.workspaces.get(req.params.id);
      if (!ws) return res.status(404).json({ error: true, code: 404, reference: 'WORKSPACE_NOT_FOUND' });
      ws.features = { conversationAnalytics: !!req.body.conversationAnalytics };
      return res.json({ features: ws.features });
    });
    r.post('/webhook-endpoints', (req, res) => {
      const ep = { id: oid(), url: req.body.url, events: req.body.events, status: 'active' };
      this.webhookEndpoints.push(ep);
      return res.status(201).json({ ...ep, secret: 'secret-shown-once' });
    });
    r.get('/webhook-endpoints', (_req, res) => res.json({ endpoints: this.webhookEndpoints }));
    this.conversationRoutes(r);
    app.use('/api/partner/v1', r);
  }

  /** P4b partner conversation API: strict bodies, Idempotency-Key replay, same-origin inbound URL. */
  private conversationRoutes(r: express.Router) {
    const invalid = (res: express.Response, message: string) => res.status(422).json({ error: true, code: 422, reference: 'INVALID_BODY', message, details: [{ path: '', message }] });
    const strict = (body: Record<string, unknown>, allowed: string[]) => Object.keys(body ?? {}).every((k) => allowed.includes(k));
    const ws: express.RequestHandler = (req, res, next) =>
      this.workspaces.has(req.params.workspaceId!) ? next() : res.status(404).json({ error: true, code: 404, reference: 'WORKSPACE_NOT_FOUND' });
    // Idempotency-Key: same request -> stored answer + Idempotent-Replayed; same key, other request -> 409.
    const idem: express.RequestHandler = (req, res, next) => {
      const key = req.header('idempotency-key');
      if (!key) return next();
      const hash = JSON.stringify([req.method, req.path, req.body]);
      const id = `${req.params.workspaceId}:${key}`;
      const hit = this.idempotency.get(id);
      if (hit && hit.hash !== hash) return res.status(409).json({ error: true, code: 409, reference: 'IDEMPOTENCY_KEY_REUSED' });
      if (hit) return res.status(hit.status).set('Idempotent-Replayed', 'true').json(hit.body);
      const json = res.json.bind(res);
      res.json = (body: unknown) => {
        if (res.statusCode < 300) {
          this.idempotency.set(id, { hash, status: res.statusCode, body });
          this.actions.push({ method: req.method, path: req.path, body: req.body, key });
        }
        return json(body);
      };
      return next();
    };
    const channel: express.RequestHandler = (req, res, next) => (['whatsapp', 'sms', 'instagram'].includes(req.params.channel!) ? next() : invalid(res, 'channel'));
    const base = '/workspaces/:workspaceId';
    const conv = `${base}/conversations/:channel/:conversationId`;

    r.put(`${base}/inbound-routing`, ws, (req, res) => {
      const b = req.body as { sessions?: Array<{ channel: string; sessionId: string }>; url?: string };
      if (!strict(b, ['sessions', 'url']) || !Array.isArray(b.sessions)) return invalid(res, 'body');
      const stored = this.inboundRouting.get(req.params.workspaceId!);
      let url = stored?.url ?? null;
      if (b.url !== undefined) {
        const parsed = new URL(b.url);
        if (parsed.protocol !== 'https:') return invalid(res, 'url must use https');
        const ok = this.webhookEndpoints.some((e) => e.status === 'active' && new URL(e.url).origin === parsed.origin);
        if (!ok) return invalid(res, 'url must be on the origin of an active webhook endpoint');
        url = b.url;
      }
      if (!url && b.sessions.length) return invalid(res, 'url is required');
      for (const [i, s] of b.sessions.entries()) {
        if (!this.sessions.some((x) => x._id === s.sessionId && x.channel === s.channel && x.workspaceId === req.params.workspaceId)) {
          return invalid(res, `sessions.${i}.sessionId: session not found in this workspace`);
        }
      }
      this.inboundRouting.set(req.params.workspaceId!, { url, sessions: b.sessions });
      return res.json({ sessions: b.sessions, url });
    });
    r.get(`${conv}/context`, ws, channel, (req, res) => res.json(this.conversations.get(req.params.conversationId!) ?? { vars: {} }));
    r.get(`${conv}/human-replied`, ws, channel, (req, res) => (Number.isNaN(Date.parse(String(req.query.since))) ? invalid(res, 'since') : res.json({ replied: false })));
    r.get(`${base}/business-hours`, ws, (_req, res) => res.json({ businessHours: null }));
    r.post(`${conv}/messages`, ws, channel, idem, (req, res) => {
      const b = req.body as { text?: string; templateId?: string };
      const okText = strict(b, ['text']) && typeof b.text === 'string' && b.text.length >= 1 && b.text.length <= 4096;
      const okTemplate = strict(b, ['templateId']) && typeof b.templateId === 'string';
      if (!okText && !okTemplate) return invalid(res, 'text must be 1..4096 characters');
      return res.status(201).json({ messageId: oid() });
    });
    r.post(`${conv}/card/move`, ws, channel, idem, (req, res) => {
      if (!strict(req.body, ['columnId', 'boardId']) || typeof req.body.columnId !== 'string') return invalid(res, 'body must be {columnId, boardId?}');
      return res.json({ cardId: this.conversations.get(req.params.conversationId!)?.linkedCardId ?? null });
    });
    r.post(`${base}/cards/:cardId/labels`, ws, idem, (req, res) => {
      if (!strict(req.body, ['text', 'color']) || !req.body.text || req.body.text.length > 100) return invalid(res, 'text');
      return res.json({ cardId: req.params.cardId, text: req.body.text });
    });
    r.patch(`${base}/cards/:cardId/fields`, ws, idem, (req, res) => {
      if (!strict(req.body, ['fieldId', 'value'])) return invalid(res, 'body');
      return res.json({ cardId: req.params.cardId, fieldId: req.body.fieldId });
    });
    r.post(`${conv}/handoff`, ws, channel, idem, (req, res) => {
      if (!strict(req.body, ['reason', 'assignMode', 'userIds', 'specificUserId', 'workspaceRoleId'])) return invalid(res, 'body');
      return res.json({ state: 'human_handoff' });
    });
    // `evaluate-condition` and `extract` do not exist in JSYNQ: unknown routes answer 404.
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
    r.get('/workspaces/:id', (req, res) => {
      const ws = this.workspaces.get(req.params.id);
      if (!ws || !ws.members.includes(res.locals.user.id)) return res.status(403).json({ message: 'You do not have access to this workspace' });
      return res.json({ status: true, workspace: { _id: ws._id, name: ws.name, owner: { _id: ws.owner }, members: ws.members.map((m) => ({ _id: m })), businessHours: ws.businessHours ?? null } });
    });
    r.get('/roles/workspaces/:id', (_req, res) => res.json({ status: true, roles: [] }));

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

    const binding = (req: express.Request, res: express.Response) => {
      const b = this.bindings.get(req.params.id!);
      return b && b.workspaceId === res.locals.ws ? b : null;
    };
    r.post('/automation-bindings', scoped, (req, res) => {
      const b = req.body as Binding;
      const session = this.sessions.find((s) => s._id === b.sessionId && s.workspaceId === res.locals.ws);
      if (!session) return res.status(400).json({ error: true, code: 400, message: 'Session not found in this workspace' });
      const assignee = (b.policy as { handoffAssigneeUserId?: string })?.handoffAssigneeUserId;
      if (assignee && !this.workspaces.get(res.locals.ws)!.members.includes(assignee)) {
        return res.status(400).json({ error: true, code: 400, message: 'handoffAssigneeUserId must be a member of the workspace' });
      }
      const _id = oid();
      const row: Binding = { _id, workspaceId: res.locals.ws, agentId: b.agentId, channel: b.channel, sessionId: b.sessionId, status: 'active', policy: b.policy };
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

    for (const channel of ['whatsapp', 'sms', 'instagram'] as const) {
      r.get(`/${channel}-lite/sessions`, scoped, (_req, res) =>
        res.json({ success: true, data: this.sessions.filter((s) => s.workspaceId === res.locals.ws && s.channel === channel) })
      );
    }

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
      return res.json({ success: true, data: { items: ids.filter((id) => this.documents.has(id)).map((id) => ({ id: oid(), refId: id, status: 'ready', pageCount: 2 })) } });
    });
    r.delete('/documents/:id', scoped, (req, res) => {
      this.documents.delete(String(req.params.id));
      return res.json({ message: 'Document deleted successfully' });
    });
    app.use('/api', r);
  }
}
