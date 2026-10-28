import { resetEnvCache } from '../../config/env';
import { partnerClient, userClient } from '../../lib/jsynq';
import { AgentSetupModel } from '../../modules/agents/models';
import { jsynqAgentPorts } from '../../modules/agents/ports';
import { AgentService } from '../../modules/agents/service';
import { sweepOrphanAgents } from '../../modules/agents/sweeper';
import { FakeJsynq, PARTNER_KEY } from '../helpers/fakeJsynq';
import { clearMongo, startMongo, stopMongo } from '../helpers/mongo';
import { userToken } from '../helpers/tokens';

const form = {
  businessName: 'Loja Azul',
  businessDescription: 'Loja de roupas no centro da cidade.',
  handoff: { triggers: [], keywords: [] },
  receptionist: { faqs: [{ question: 'Abrem sábado?', answer: 'Sim, até 13h.' }], policies: [] },
};

describe('AgentService against JSYNQ (fake HTTP)', () => {
  let jsynq: FakeJsynq;
  let workspaceId: string;
  let userId: string;
  let service: AgentService;
  let sessionA: string;
  let sessionB: string;

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
    userId = 'a'.repeat(24);
    jsynq.users.set(userId, { id: userId, email: 'o@x.com', name: 'O', managed: true });
    workspaceId = jsynq.addWorkspace(userId);
    sessionA = jsynq.addSession(workspaceId);
    sessionB = jsynq.addSession(workspaceId, 'sms', 'active');
    service = new AgentService(jsynqAgentPorts(userClient(userToken({ id: userId, workspaceId })), workspaceId));
  });
  const ctx = () => ({ workspaceId, userId });

  it('rolls back the JSYNQ agent and bindings when a step fails, so a retry starts clean', async () => {
    let calls = 0;
    const real = jsynq.bindings.set.bind(jsynq.bindings);
    jsynq.bindings.set = (k, v) => {
      calls += 1;
      if (calls === 2) throw new Error('boom');
      return real(k, v);
    };
    await expect(
      service.createFromTemplate(ctx(), { templateKey: 'receptionist', form, lines: [{ channel: 'whatsapp', sessionId: sessionA }, { channel: 'sms', sessionId: sessionB }], clientRequestId: 'retry-0001' })
    ).rejects.toBeTruthy();
    jsynq.bindings.set = real;
    expect([...jsynq.agents.values()].every((a) => !a.isActive)).toBe(true);
    expect(jsynq.bindings.size).toBe(0);
    expect(await AgentSetupModel.countDocuments()).toBe(0);

    const ok = await service.createFromTemplate(ctx(), { templateKey: 'receptionist', form, lines: [{ channel: 'whatsapp', sessionId: sessionA }], clientRequestId: 'retry-0001' });
    expect(ok.created).toBe(true);
    expect(ok.view.status).toBe('paused');
  });

  it('a failed rollback leaves a journal the hourly sweeper cleans with a partner login token', async () => {
    jsynq.failures['POST /api/automation-bindings'] = 400;
    const realDelete = jsynq.agents.get.bind(jsynq.agents);
    let failDelete = true;
    jsynq.agents.get = (id) => {
      if (failDelete && jsynq.calls.at(-1)?.startsWith('DELETE')) throw new Error('JSYNQ down');
      return realDelete(id);
    };
    await expect(service.createFromTemplate(ctx(), { templateKey: 'receptionist', form, lines: [{ channel: 'whatsapp', sessionId: sessionA }], clientRequestId: 'sweep-0001' })).rejects.toMatchObject({ reference: 'JSYNQ_REJECTED' });
    const journal = await AgentSetupModel.findOne({ clientRequestId: 'sweep-0001' }).lean();
    expect(journal?.state).toBe('failed');
    expect(journal?.pending?.agentId).toBeTruthy();

    failDelete = false;
    const out = await sweepOrphanAgents({ partner: partnerClient(PARTNER_KEY), user: userClient, now: () => new Date() });
    expect(out).toEqual({ cleaned: 1, skipped: 0 });
    expect(jsynq.agents.get(journal!.pending!.agentId!)?.isActive).toBe(false);
    expect(await AgentSetupModel.countDocuments()).toBe(0);
  });

  it('patch: recompiles, re-pushes, adds/removes lines; new lines follow the paused state; lines must exist', async () => {
    const { view } = await service.createFromTemplate(ctx(), { templateKey: 'receptionist', form, lines: [{ channel: 'whatsapp', sessionId: sessionA }], clientRequestId: 'patch-0001' });
    const next = await service.patchSetup(ctx(), view.id, { form: { ...form, businessName: 'Loja Verde' }, lines: [{ channel: 'sms', sessionId: sessionB }] });
    expect(next.lines).toEqual([expect.objectContaining({ channel: 'sms', sessionId: sessionB, active: false })]);
    expect(jsynq.bindings.size).toBe(1);
    expect(jsynq.agents.get(view.agentId)?.systemPrompt).toContain('Loja Verde');
    await expect(service.patchSetup(ctx(), view.id, { form, lines: [{ channel: 'whatsapp', sessionId: 'f'.repeat(24) }] })).rejects.toMatchObject({
      details: { code: 'ATTENDE_AGENT_LINE_NOT_FOUND' },
    });
    await expect(service.patchSetup(ctx(), view.id, { form: { ...form, handoff: { triggers: [], keywords: [], target: { kind: 'user', userId: 'b'.repeat(24) } } } })).rejects.toMatchObject({
      details: { code: 'ATTENDE_AGENT_VALIDATION' },
    });
  });

  it('go-live refuses without lines or with a disconnected line', async () => {
    const { view } = await service.createFromTemplate(ctx(), { templateKey: 'receptionist', form, lines: [], clientRequestId: 'live-0001' });
    expect(view.status).toBe('draft');
    await expect(service.goLive(ctx(), view.id)).rejects.toMatchObject({ details: { code: 'ATTENDE_AGENT_NOT_READY', reason: 'no_lines' } });
    jsynq.sessions[0]!.status = 'disconnected';
    await service.patchSetup(ctx(), view.id, { form, lines: [{ channel: 'whatsapp', sessionId: sessionA }] });
    const fresh = new AgentService(jsynqAgentPorts(userClient(userToken({ id: userId, workspaceId })), workspaceId));
    await expect(fresh.goLive(ctx(), view.id)).rejects.toMatchObject({ details: { code: 'ATTENDE_AGENT_LINE_NOT_CONNECTED' } });
  });

  it('another workspace never sees the agent', async () => {
    const { view } = await service.createFromTemplate(ctx(), { templateKey: 'receptionist', form, lines: [], clientRequestId: 'iso-00001' });
    await expect(service.get('c'.repeat(24), view.id)).rejects.toMatchObject({ details: { code: 'ATTENDE_AGENT_NOT_FOUND' } });
  });
});
