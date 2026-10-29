import fs from 'fs';
import path from 'path';
import { ATTENDE_ROUTES, findAttendeRoute } from '../../routes';

const APP_DIR = path.resolve(__dirname, '../../../app');
const fileOf = (routePath: string) => path.join(APP_DIR, routePath.replace(/:(\w+)/g, '[$1]'), 'route.ts');

/** The Next.js route files and the in-process table must serve the same handlers on the same paths. */
describe('app/api route files', () => {
  it.each(ATTENDE_ROUTES.map((r) => [r.method, r.path, r] as const))('%s %s is exported by its route.ts', (method, routePath, route) => {
    const file = fileOf(routePath);
    expect(fs.existsSync(file)).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(file) as Record<string, unknown>;
    expect(mod[method]).toBe(route.handler);
    expect(mod.runtime).toBe('nodejs');
    expect(mod.dynamic).toBe('force-dynamic');
  });

  it('has no Attende route file outside the table', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name === 'route.ts') files.push(full);
      }
    };
    for (const dir of ['attende', 'messaging-automations', 'cron']) walk(path.join(APP_DIR, 'api', dir));
    // The JSYNQ partner webhook / inbound-routing endpoints are gone (no partner API), and so is Attende's own Stripe
    // webhook: JSYNQ's webhook syncs every subscription change.
    expect(fs.existsSync(path.join(APP_DIR, 'api', 'jsynq'))).toBe(false);
    expect(fs.existsSync(path.join(APP_DIR, 'api', 'stripe'))).toBe(false);
    const expected = new Set(ATTENDE_ROUTES.map((r) => fileOf(r.path)));
    expect(files.filter((f) => !expected.has(f))).toEqual([]);
  });

  it('matches static segments before parameters', () => {
    expect(findAttendeRoute('GET', '/api/attende/agents/templates')?.route.path).toBe('/api/attende/agents/templates');
    expect(findAttendeRoute('GET', '/api/attende/agents/abc')?.params).toEqual({ id: 'abc' });
    expect(findAttendeRoute('POST', '/api/messaging-automations/advanced/preview')?.route.path).toBe('/api/messaging-automations/advanced/preview');
    expect(findAttendeRoute('DELETE', '/api/attende/agents/a/knowledge/d%201')?.params).toEqual({ id: 'a', documentId: 'd 1' });
    expect(findAttendeRoute('PUT', '/api/attende/agents/a')).toBeNull();
  });
});
