import { randomBytes } from 'crypto';
import type express from 'express';

const oid = () => randomBytes(12).toString('hex');

export type FakeCard = {
  _id: string;
  workspaceId: string;
  project: string;
  board: string;
  column: string;
  title: string;
  contactIds: string[];
  assignedUsers: string[];
  labels: string[];
  leadSource: string[];
  cardProducts: Array<{ quantity: number; price: number; discount?: { type: string; value: number } }>;
  customFields: Array<{ fieldId: string; fieldType?: string; value: unknown }>;
  cardStatus: string;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type FakeColumn = { _id: string; board: string; title: string; columnStatus: string };
export type FakeContact = { _id: string; workspaceId: string; fullName: string; phone: string; email: string };
export type FakeConversation = {
  _id: string;
  workspaceId: string;
  channel: 'whatsapp' | 'sms' | 'instagram';
  sessionId: string;
  createdAt: string;
  lastMessageAt: string;
  lastMessageDirection: 'inbound' | 'outbound';
  conversationState?: string;
  conversationStateHistory?: Array<{ state: string; changedAt: string; changedBy?: string; reason?: string }>;
  automationBindingId?: string | null;
  activeAgent?: { _id: string; name: string } | null;
  linkedEntityType?: string | null;
  linkedEntityId?: string | null;
  crmProjectId?: string | null;
};
export type FakeMessage = {
  _id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  senderType: 'contact' | 'agent' | 'user';
  agentExecutionId?: string | null;
  senderAgent?: { source: string } | null;
  status?: string;
  createdAt: string;
};

/**
 * The CRM and messaging part of the fake JSYNQ, as these routes are on `origin/staging`: projects/boards/columns,
 * the paginated card list (skip/limit, `updatedAt` sort, `_id` tie-break), the card update that moves a card, labels,
 * lead sources, workspace users, the contact directory and deals, the unified inbox and the message lists.
 */
export class FakeCrm {
  boards: Array<{ _id: string; project: string; workspaceId: string }> = [];
  columns: FakeColumn[] = [];
  cards: FakeCard[] = [];
  labels: Array<{ _id: string; project: string; text: string; color: string }> = [];
  leadSources: Array<{ _id: string; project: string; text: string; color: string }> = [];
  users: Array<{ id: string; name: string; email: string; image: string | null }> = [];
  contacts: FakeContact[] = [];
  conversations: FakeConversation[] = [];
  messages: FakeMessage[] = [];
  cardsGets = 0;
  /** Every `/cards/paginated` query, as received. */
  cardQueries: Array<Record<string, unknown>> = [];
  /** Every card update: `{cardId, body}`. */
  updates: Array<{ cardId: string; body: Record<string, unknown> }> = [];

  reset() {
    this.boards = [];
    this.columns = [];
    this.cards = [];
    this.labels = [];
    this.leadSources = [];
    this.users = [];
    this.contacts = [];
    this.conversations = [];
    this.messages = [];
    this.cardQueries = [];
    this.updates = [];
    this.cardsGets = 0;
  }

  addBoard(workspaceId: string, projectId: string, titles: Array<[string, string]> = [['Lead', 'todo'], ['Qualified', 'inProgress'], ['Won', 'win'], ['Lost', 'lost']]) {
    const _id = oid();
    this.boards.push({ _id, project: projectId, workspaceId });
    const columns = titles.map(([title, columnStatus]) => ({ _id: oid(), board: _id, title, columnStatus }));
    this.columns.push(...columns);
    return { boardId: _id, columns: columns.map((c) => c._id) };
  }

  addCard(over: Partial<FakeCard> & Pick<FakeCard, 'workspaceId' | 'project' | 'board' | 'column'>): FakeCard {
    const now = new Date().toISOString();
    const card: FakeCard = {
      _id: oid(),
      title: 'Deal',
      contactIds: [],
      assignedUsers: [],
      labels: [],
      leadSource: [],
      cardProducts: [],
      customFields: [],
      cardStatus: 'todo',
      lastMessageAt: null,
      createdAt: now,
      updatedAt: now,
      ...over,
    };
    this.cards.push(card);
    return card;
  }

  install(r: express.Router, scoped: express.RequestHandler) {
    const ws = (res: express.Response) => res.locals.ws as string;
    const contactDoc = (id: string) => {
      const c = this.contacts.find((x) => x._id === id);
      return c ? { _id: c._id, fullName: c.fullName, email: c.email, phone: c.phone } : id;
    };
    const csv = (v: unknown) => (typeof v === 'string' && v ? v.split(',') : []);

    r.get('/projects/:p/columns/kanban', scoped, (req, res) => {
      const board = this.boards.find((b) => b.project === req.params.p && b.workspaceId === ws(res) && (!req.query.boardId || b._id === req.query.boardId));
      if (!board) return res.status(404).json({ error: true, code: 404, message: 'Project not found' });
      const columns = this.columns.filter((c) => c.board === board._id).map((c) => ({ columnId: c._id, title: c.title, statusId: null, columnStatus: c.columnStatus }));
      return res.json({ success: true, projectId: req.params.p, boardId: board._id, columns, boards: [] });
    });

    r.get('/projects/:p/boards/:b/cards/initial', scoped, (req, res) => {
      const columns: Record<string, { cards: unknown[]; pagination: { total: number } }> = {};
      for (const c of this.columns.filter((x) => x.board === req.params.b)) {
        const cards = this.cards.filter((k) => k.column === c._id && k.workspaceId === ws(res));
        columns[c._id] = { cards: cards.slice(0, Number(req.query.limitPerColumn ?? 20)), pagination: { total: cards.length } };
      }
      return res.json({ success: true, columns });
    });

    r.get('/projects/:p/cards/paginated', scoped, (req, res) => {
      this.cardQueries.push({ ...req.query });
      const q = req.query as Record<string, string | undefined>;
      let list = this.cards.filter((c) => c.workspaceId === ws(res) && c.project === req.params.p);
      if (q.boardId) list = list.filter((c) => c.board === q.boardId);
      if (q.columnId) list = list.filter((c) => c.column === q.columnId);
      if (q.search) list = list.filter((c) => c.title.toLowerCase().includes(q.search!.toLowerCase()));
      if (q.assignee) list = list.filter((c) => csv(q.assignee).some((a) => c.assignedUsers.includes(a)));
      if (q.labels) list = list.filter((c) => csv(q.labels).some((a) => c.labels.includes(a)));
      if (q.leadSources) list = list.filter((c) => csv(q.leadSources).some((a) => c.leadSource.includes(a)));
      if (q.createdAtFrom) list = list.filter((c) => c.createdAt >= q.createdAtFrom!);
      if (q.createdAtTo) list = list.filter((c) => c.createdAt <= q.createdAtTo!);
      const dir = q.orderBy === 'updatedAt:asc' ? 1 : -1;
      list.sort((a, b) => (a.updatedAt === b.updatedAt ? (a._id < b._id ? -dir : dir) : a.updatedAt < b.updatedAt ? -dir : dir));
      const page = Number(q.page ?? 1);
      const limit = Number(q.limit ?? 10);
      const slice = list.slice((page - 1) * limit, page * limit).map((c) => ({ ...c, contactIds: c.contactIds.map(contactDoc) }));
      return res.json({ success: true, cards: slice, pagination: { total: list.length, page, limit, totalPages: Math.ceil(list.length / limit) } });
    });

    r.get('/projects/:p/cards/:id/:channelConversations', scoped, (req, res) => {
      const channel = req.params.channelConversations!.replace('-conversations', '');
      const data = this.conversations.filter((c) => c.workspaceId === ws(res) && c.channel === channel && c.linkedEntityId === req.params.id);
      return res.json({ success: true, data, meta: { total: data.length } });
    });

    r.get('/projects/:p/cards/:id', scoped, (req, res) => {
      this.cardsGets += 1;
      const card = this.cards.find((c) => c._id === req.params.id && c.workspaceId === ws(res));
      if (!card) return res.status(404).json({ error: true, code: 404, message: 'Not found' });
      return res.json({ card, status: true });
    });

    r.put('/projects/:p/cards/:id', scoped, (req, res) => {
      const card = this.cards.find((c) => c._id === req.params.id && c.workspaceId === ws(res));
      if (!card) return res.status(404).json({ error: true, code: 404, message: 'Not found' });
      this.updates.push({ cardId: card._id, body: req.body });
      if (req.body.column) {
        const column = this.columns.find((c) => c._id === req.body.column);
        if (!column) return res.status(500).json({ error: true, code: 500, message: 'Column not found' });
        card.column = column._id;
        card.board = column.board;
        card.cardStatus = column.columnStatus;
      }
      card.updatedAt = new Date().toISOString();
      return res.json({ status: true, card });
    });

    r.get('/projects/:p/labels', scoped, (req, res) => res.json({ status: true, labels: this.labels.filter((l) => l.project === req.params.p) }));
    r.get('/projects/:p/lead-sources', scoped, (req, res) => res.json({ success: true, leadSources: this.leadSources.filter((l) => l.project === req.params.p) }));
    r.get('/users/workspaces/:id', (_req, res) => res.json({ members: this.users }));

    r.get('/workspaces/:w/directory', (req, res) => {
      const q = req.query as Record<string, string | undefined>;
      let list = this.contacts.filter((c) => c.workspaceId === req.params.w);
      if (q.search) list = list.filter((c) => [c.fullName, c.phone, c.email].some((v) => v.toLowerCase().includes(q.search!.toLowerCase())));
      list.sort((a, b) => a.fullName.localeCompare(b.fullName));
      const page = Number(q.page ?? 1);
      const limit = Math.min(100, Number(q.limit ?? 25));
      const items = list.slice((page - 1) * limit, page * limit).map((c) => ({ id: c._id, rowType: 'contact', name: c.fullName, phone: c.phone, email: c.email, instagram: '', labelIds: [], createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-02T00:00:00.000Z' }));
      return res.json({ success: true, items, pagination: { total: list.length, page, limit, totalPages: Math.ceil(list.length / limit), hasNextPage: page * limit < list.length } });
    });
    r.get('/workspaces/:w/contacts/:id/deals', (req, res) => {
      const items = this.cards
        .filter((c) => c.workspaceId === req.params.w && c.contactIds.includes(req.params.id!))
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
        .map((c) => ({ id: c._id, columnId: c.column, cardStatus: c.cardStatus, updatedAt: c.updatedAt }));
      return res.json({ success: true, items, summary: {}, pagination: { total: items.length } });
    });

    // --- messaging ------------------------------------------------------------------------------------
    r.get('/workspaces/:w/messaging/inbox/conversations', (req, res) => {
      const limit = Math.min(50, Number(req.query.limit ?? 30));
      const offset = req.query.cursor ? Number(Buffer.from(String(req.query.cursor), 'base64url').toString()) : 0;
      const list = this.conversations
        .filter((c) => c.workspaceId === req.params.w)
        .sort((a, b) => (a.lastMessageAt === b.lastMessageAt ? (a._id < b._id ? 1 : -1) : a.lastMessageAt < b.lastMessageAt ? 1 : -1));
      const page = list.slice(offset, offset + limit);
      const hasMore = offset + limit < list.length;
      return res.json({
        success: true,
        data: page.map((c) => ({ channel: c.channel, sessionId: c.sessionId, sessionLabel: '', conversation: c })),
        meta: { limit, hasMore, nextCursor: hasMore ? Buffer.from(String(offset + limit)).toString('base64url') : null },
      });
    });
    for (const channel of ['whatsapp', 'sms', 'instagram'] as const) {
      r.get(`/${channel}-lite/sessions/:s/conversations/:id/messages`, scoped, (req, res) => {
        const limit = Math.min(channel === 'instagram' ? 200 : 1000, Number(req.query.limit ?? 50));
        let list = this.messages.filter((m) => m.conversationId === req.params.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        if (channel === 'instagram') {
          if (req.query.before) list = list.filter((m) => m.createdAt < String(req.query.before));
          return res.json({ success: true, data: list.slice(0, limit) });
        }
        const offset = Number(req.query.offset ?? 0);
        return res.json({ success: true, data: list.slice(offset, offset + limit), meta: { total: list.length, limit, offset } });
      });
    }
  }
}
