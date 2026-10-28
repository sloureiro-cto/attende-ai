import request from 'supertest';
import { resetEnvCache } from '../../config/env';
import { clearMembershipCache } from '../../middleware/auth';
import { EntitlementModel } from '../../modules/billing/models';
import { clearFunnelCaches } from '../../modules/funnel/board';
import { clearFunnelLookups, FUNNEL_EXPORT_MAX_ROWS } from '../../modules/funnel/service';
import { createApp } from '../helpers/app';
import { testDeps } from '../helpers/deps';
import { FakeJsynq } from '../helpers/fakeJsynq';
import { clearMongo, startMongo, stopMongo } from '../helpers/mongo';
import { userToken } from '../helpers/tokens';

describe('funnel routes over the JSYNQ staging CRM routes', () => {
  let jsynq: FakeJsynq;
  const app = createApp(testDeps(), null);
  const userId = 'a'.repeat(24);
  let workspaceId: string;
  let token: string;
  let projectId: string;
  let boardId: string;
  let cols: string[];

  beforeAll(async () => {
    await startMongo();
    jsynq = await new FakeJsynq().start();
    process.env.JSYNQ_API_URL = jsynq.url;
    resetEnvCache();
  });
  afterAll(async () => {
    await jsynq.stop();
    await stopMongo();
  });
  beforeEach(async () => {
    await clearMongo();
    jsynq.reset();
    clearFunnelCaches();
    clearFunnelLookups();
    clearMembershipCache();
    jsynq.addUser('o@x.com', { id: userId });
    workspaceId = jsynq.addWorkspace(userId);
    token = userToken({ id: userId, workspaceId });
    await EntitlementModel.create({ workspaceId, tier: 'attende_growth', status: 'active', limits: { lines: 3, agents: 3, aiRepliesPerMonth: 5000, seats: 5, docs: 100 } });
    projectId = 'b'.repeat(24);
    // A kanban project first: only the CRM one is the funnel.
    jsynq.projects.push({ _id: 'c'.repeat(24), workspaceId, title: 'Tasks', projectType: { title: 'kanban' }, columns: [] });
    jsynq.projects.push({ _id: projectId, workspaceId, title: 'CRM', projectType: { title: 'crm' }, columns: [] });
    ({ boardId, columns: cols } = jsynq.crm.addBoard(workspaceId, projectId));
  });

  const get = (path: string) => request(app).get(path).set('Authorization', `Bearer ${token}`);
  const at = (minute: number) => new Date(Date.UTC(2026, 9, 20, 12, minute)).toISOString();
  const card = (column: string, minute: number, over: Parameters<typeof jsynq.crm.addCard>[0] extends infer T ? Partial<T> : never = {}) =>
    jsynq.crm.addCard({ workspaceId, project: projectId, board: boardId, column, updatedAt: at(minute), createdAt: at(minute), ...over });

  it('maps a JSYNQ card to the funnel row the app renders', async () => {
    const contact = { _id: 'd'.repeat(24), workspaceId, fullName: 'Ana Souza', phone: '+5511999998888', email: 'ana@x.com' };
    jsynq.crm.contacts.push(contact);
    jsynq.crm.users.push({ id: 'e'.repeat(24), name: 'Bruno', email: 'b@x.com', image: null });
    jsynq.crm.labels.push({ _id: 'f'.repeat(24), project: projectId, text: 'VIP', color: '#f00' });
    jsynq.crm.leadSources.push({ _id: '1'.repeat(24), project: projectId, text: 'Instagram', color: '#00f' });
    const c = card(cols[1]!, 5, {
      title: 'Ana deal',
      contactIds: [contact._id],
      assignedUsers: ['e'.repeat(24)],
      labels: ['f'.repeat(24)],
      leadSource: ['1'.repeat(24)],
      cardProducts: [{ quantity: 2, price: 1500, discount: { type: 'percentage', value: 10 } }],
      customFields: [{ fieldId: 'estimateRevenue', value: 999 }, { fieldId: 'value', fieldType: 'currency', value: { currency: 'brl' } }],
      cardStatus: 'inProgress',
      lastMessageAt: at(4),
    });

    const res = await get('/api/attende/funnel?maskPhone=true');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ hasMore: false, nextCursor: null, partial: false, board: { id: boardId, projectId } });
    expect(res.body.data.items).toEqual([
      {
        cardId: c._id,
        title: 'Ana deal',
        contact: { id: contact._id, name: 'Ana Souza', phone: '5511•••••••88', email: 'ana@x.com', avatarUrl: null },
        stage: { id: cols[1], name: 'Qualified', color: null, order: 1, kind: 'open' },
        // Products win over the estimated revenue: 2 x 15.00 - 10%.
        deal: { value: 27, currency: 'BRL', status: 'open' },
        owner: { id: 'e'.repeat(24), name: 'Bruno', avatarUrl: null },
        labels: [{ id: 'f'.repeat(24), text: 'VIP', color: '#f00' }],
        sources: [{ id: '1'.repeat(24), text: 'Instagram' }],
        lastMessageAt: at(4),
        conversation: null,
        createdAt: at(5),
        updatedAt: at(5),
      },
    ]);
  });

  it('pages one board list by skip/limit with the filters JSYNQ applies', async () => {
    for (let i = 0; i < 60; i += 1) card(cols[i % 2]!, i, { title: i % 3 === 0 ? `Ana ${i}` : `Bia ${i}`, assignedUsers: ['e'.repeat(24)] });
    const first = await get(`/api/attende/funnel?limit=25&sort=updated_desc&assignee=${'e'.repeat(24)}&createdFrom=2026-10-20&createdTo=2026-10-20`);
    expect(first.status).toBe(200);
    expect(first.body.data.items).toHaveLength(25);
    expect(first.body.data.items[0].title).toBe('Bia 59');
    expect(first.body.data.hasMore).toBe(true);
    expect(jsynq.crm.cardQueries[0]).toMatchObject({
      boardId,
      orderBy: 'updatedAt:desc',
      assignee: 'e'.repeat(24),
      createdAtFrom: '2026-10-20T00:00:00.000Z',
      createdAtTo: '2026-10-20T23:59:59.999Z',
      limit: '25',
      page: '1',
    });
    const seen = new Set<string>(first.body.data.items.map((r: { cardId: string }) => r.cardId));
    let cursor = first.body.data.nextCursor as string | null;
    while (cursor) {
      const next = await get(`/api/attende/funnel?limit=25&sort=updated_desc&assignee=${'e'.repeat(24)}&createdFrom=2026-10-20&createdTo=2026-10-20&cursor=${cursor}`);
      next.body.data.items.forEach((r: { cardId: string }) => seen.add(r.cardId));
      cursor = next.body.data.nextCursor;
    }
    expect(seen.size).toBe(60);

    const search = await get('/api/attende/funnel?q=ana&sort=updated_asc');
    expect(search.body.data.items.map((r: { title: string }) => r.title).slice(0, 2)).toEqual(['Ana 0', 'Ana 3']);
    expect(jsynq.crm.cardQueries.at(-1)).toMatchObject({ search: 'ana', orderBy: 'updatedAt:asc' });
  });

  it('merges one list per selected stage in sort order and resumes each from the cursor', async () => {
    for (let i = 0; i < 30; i += 1) card(cols[i % 3]!, i, { title: `Deal ${i}` });
    const q = `stage=${cols[0]},${cols[2]}&limit=25`;
    const first = await get(`/api/attende/funnel?${q}`);
    expect(first.body.data.items.map((r: { title: string }) => r.title)).toEqual(
      Array.from({ length: 30 }, (_, i) => 29 - i)
        .filter((i) => i % 3 !== 1)
        .slice(0, 20)
        .map((i) => `Deal ${i}`)
    );
    expect(first.body.data.hasMore).toBe(false);
    // One JSYNQ query per stage, each filtered by its column.
    expect(jsynq.crm.cardQueries.map((x) => x.columnId).sort()).toEqual([cols[0], cols[2]].sort());

    jsynq.crm.cardQueries = [];
    const small = await get(`/api/attende/funnel?stage=${cols[0]},${cols[2]}&limit=25`);
    expect(small.body.data.items).toHaveLength(20);
    // A cursor minted for other filters is refused.
    const other = await get(`/api/attende/funnel?stage=${cols[0]}&cursor=${Buffer.from(JSON.stringify({ v: 1, f: 'x', o: {} })).toString('base64url')}`);
    expect(other.status).toBe(400);
    expect(other.body.reference).toBe('FUNNEL_INVALID_CURSOR');
  });

  it('pages a merged list without repeating or losing a deal', async () => {
    for (let i = 0; i < 80; i += 1) card(cols[i % 4]!, i, { title: `Deal ${i}` });
    const q = `stage=${cols[0]},${cols[1]},${cols[3]}&limit=25`;
    const titles: string[] = [];
    let cursor: string | null = null;
    do {
      const res = await get(`/api/attende/funnel?${q}${cursor ? `&cursor=${cursor}` : ''}`);
      titles.push(...res.body.data.items.map((r: { title: string }) => r.title));
      cursor = res.body.data.nextCursor;
    } while (cursor);
    const expected = Array.from({ length: 80 }, (_, i) => 79 - i)
      .filter((i) => i % 4 !== 2)
      .map((i) => `Deal ${i}`);
    expect(titles).toEqual(expected);
  });

  it('answers stages with cached counts and the board, and FUNNEL_NO_BOARD without a CRM project', async () => {
    card(cols[0]!, 1);
    card(cols[0]!, 2);
    card(cols[2]!, 3);
    const res = await get('/api/attende/funnel/stages');
    expect(res.body.data).toEqual({
      board: { id: boardId, projectId },
      stages: [
        { id: cols[0], name: 'Lead', color: null, order: 0, kind: 'open', count: 2 },
        { id: cols[1], name: 'Qualified', color: null, order: 1, kind: 'open', count: 0 },
        { id: cols[2], name: 'Won', color: null, order: 2, kind: 'won', count: 1 },
        { id: cols[3], name: 'Lost', color: null, order: 3, kind: 'lost', count: 0 },
      ],
      total: 3,
    });
    card(cols[1]!, 4);
    // Cached for 20 s.
    expect((await get('/api/attende/funnel/stages')).body.data.total).toBe(3);

    jsynq.projects = jsynq.projects.filter((p) => p._id !== projectId);
    clearFunnelCaches();
    const none = await get('/api/attende/funnel');
    expect(none.status).toBe(404);
    expect(none.body.reference).toBe('FUNNEL_NO_BOARD');
  });

  it('moves a deal through the card update the kanban uses and refreshes the counts', async () => {
    const c = card(cols[0]!, 1);
    expect((await get('/api/attende/funnel/stages')).body.data.stages[2].count).toBe(0);
    const res = await request(app).patch(`/api/attende/funnel/${c._id}/stage`).set('Authorization', `Bearer ${token}`).send({ columnId: cols[2] });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ cardId: c._id, stage: { id: cols[2], name: 'Won', color: null, order: 2, kind: 'won' } });
    expect(jsynq.crm.updates).toEqual([{ cardId: c._id, body: { column: cols[2] } }]);
    expect(jsynq.calls).toContain(`PUT /api/projects/${projectId}/cards/${c._id}`);
    expect(c.cardStatus).toBe('win');
    expect((await get('/api/attende/funnel/stages')).body.data.stages[2].count).toBe(1);

    const foreign = await request(app).patch(`/api/attende/funnel/${c._id}/stage`).set('Authorization', `Bearer ${token}`).send({ columnId: '9'.repeat(24) });
    expect(foreign.status).toBe(404);
    expect(foreign.body.reference).toBe('FUNNEL_STAGE_NOT_FOUND');
    expect(jsynq.crm.updates).toHaveLength(1);
    const bad = await request(app).patch(`/api/attende/funnel/nope/stage`).set('Authorization', `Bearer ${token}`).send({ columnId: cols[1] });
    expect(bad.status).toBe(400);
  });

  it('lists contacts by name with their deals on the funnel board only', async () => {
    const ana = { _id: '2'.repeat(24), workspaceId, fullName: 'Ana', phone: '+5511988887777', email: 'a@x.com' };
    const bia = { _id: '3'.repeat(24), workspaceId, fullName: 'Bia', phone: '', email: 'b@x.com' };
    jsynq.crm.contacts.push(bia, ana);
    card(cols[0]!, 1, { contactIds: [ana._id], cardStatus: 'todo' });
    const won = card(cols[2]!, 5, { contactIds: [ana._id], cardStatus: 'win' });
    // A deal on another board does not count.
    jsynq.crm.addCard({ workspaceId, project: projectId, board: 'x'.repeat(24), column: '4'.repeat(24), contactIds: [ana._id] });
    const res = await get('/api/attende/funnel/contacts?limit=25');
    expect(res.status).toBe(200);
    expect(res.body.data.items.map((c: { name: string }) => c.name)).toEqual(['Ana', 'Bia']);
    expect(res.body.data.items[0]).toMatchObject({ id: ana._id, deals: { total: 2, open: 1, won: 1, lost: 0 }, latestCardId: won._id, latestStage: { id: cols[2] } });
    expect(res.body.data.items[1]).toMatchObject({ deals: { total: 0, open: 0, won: 0, lost: 0 }, latestStage: null, phone: null });
    expect(res.body.data.hasMore).toBe(false);
  });

  it('gives the drawer the deal\'s newest conversation', async () => {
    const c = card(cols[0]!, 1);
    jsynq.crm.conversations.push(
      { _id: '5'.repeat(24), workspaceId, channel: 'whatsapp', sessionId: '6'.repeat(24), createdAt: at(0), lastMessageAt: at(1), lastMessageDirection: 'inbound', linkedEntityType: 'card', linkedEntityId: c._id },
      { _id: '7'.repeat(24), workspaceId, channel: 'sms', sessionId: '8'.repeat(24), createdAt: at(0), lastMessageAt: at(9), lastMessageDirection: 'inbound', conversationState: 'human_handoff', linkedEntityType: 'card', linkedEntityId: c._id }
    );
    const res = await get(`/api/attende/funnel/${c._id}/conversation`);
    expect(res.body.data.conversation).toEqual({ channel: 'sms', id: '7'.repeat(24), sessionId: '8'.repeat(24), lastMessageAt: at(9), handling: 'human' });
  });

  it('streams the CSV page by page and stops at the row cap', async () => {
    for (let i = 0; i < FUNNEL_EXPORT_MAX_ROWS + 5; i += 1) card(cols[0]!, 0, { title: `=cmd ${i}` });
    jsynq.crm.cardQueries = [];
    const res = await get('/api/attende/funnel/export.csv').buffer(true).parse((r, cb) => {
      let text = '';
      r.on('data', (d: Buffer) => (text += d.toString()));
      r.on('end', () => cb(null, text));
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['x-export-row-cap']).toBe(String(FUNNEL_EXPORT_MAX_ROWS));
    const lines = (res.body as string).trim().split('\r\n');
    expect(lines[0]).toBe('name,phone,email,stage,deal_value,deal_currency,deal_status,owner,labels,source,last_message_at,created_at,updated_at');
    expect(lines).toHaveLength(FUNNEL_EXPORT_MAX_ROWS + 1);
    // Contact-controlled text never becomes a spreadsheet formula.
    expect(lines[1]!.startsWith("'=cmd")).toBe(true);
    // 100 cards per JSYNQ page, never more than the cap.
    expect(jsynq.crm.cardQueries.every((q) => Number(q.limit) <= 100)).toBe(true);
    expect(jsynq.crm.cardQueries).toHaveLength(FUNNEL_EXPORT_MAX_ROWS / 100);
  }, 60_000);

  it('refuses without a plan and without a token', async () => {
    expect((await request(app).get('/api/attende/funnel')).status).toBe(401);
    await EntitlementModel.deleteMany({});
    const res = await get('/api/attende/funnel');
    expect(res.status).toBe(403);
    expect(res.body.reference).toBe('ATTENDE_NOT_ENTITLED');
  });
});
