import request from 'supertest';
import { partnerClient, userClient } from '../../lib/jsynq';
import { createApp } from '../helpers/app';
import { FakeMailer } from '../helpers/fakeMailer';
import { FakeStripe } from '../helpers/fakeStripe';
import { startMongo, stopMongo } from '../helpers/mongo';

describe('cron routes', () => {
  const app = createApp({ stripe: new FakeStripe(), partner: partnerClient('pk_test_partner_key'), user: userClient, mailer: new FakeMailer(), now: () => new Date() }, null);

  beforeAll(startMongo);
  afterAll(stopMongo);

  it.each(['/api/cron/billing-reconcile', '/api/cron/agent-sweeper'])('%s needs the CRON_SECRET bearer', async (path) => {
    expect((await request(app).get(path)).body).toMatchObject({ code: 401, reference: 'CRON_UNAUTHORIZED' });
    expect((await request(app).get(path).set('Authorization', 'Bearer wrong-secret-0123456789')).status).toBe(401);
    const res = await request(app).get(path).set('Authorization', `Bearer ${process.env.CRON_SECRET}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });

  it('answers the standard 404 body for an unknown route', async () => {
    const res = await request(app).get('/api/attende/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: true, code: 404, message: 'Not found' });
  });
});
