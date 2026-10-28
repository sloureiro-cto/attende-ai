import type { IncomingMessage, ServerResponse } from 'http';
import { setAutomationsRuntime, setDeps, type Deps } from '../../deps';
import type { AutomationsRuntime } from '../../modules/automations/runtime/factory';
import { dispatchAttende } from '../../routes';

export type TestApp = (req: IncomingMessage, res: ServerResponse) => void;

/**
 * What `createApp(deps, runtime)` was in the Express service: a request listener supertest can
 * drive. It serves the same route handlers Next.js runs (`ATTENDE_ROUTES`), with these deps.
 */
export function createApp(deps: Deps, runtime: AutomationsRuntime | null): TestApp {
  return (req, res) => {
    void (async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const body = Buffer.concat(chunks);
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value === undefined) continue;
        for (const v of Array.isArray(value) ? value : [value]) headers.append(key, v);
      }
      const method = req.method ?? 'GET';
      const request = new Request(`http://attende.test${req.url ?? '/'}`, {
        method,
        headers,
        body: method === 'GET' || method === 'HEAD' || body.length === 0 ? undefined : body,
      });
      setDeps(deps);
      setAutomationsRuntime(runtime);
      const response = await dispatchAttende(request);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(Buffer.from(await response.arrayBuffer()));
    })().catch((error) => {
      res.statusCode = 500;
      res.end(String(error));
    });
  };
}
