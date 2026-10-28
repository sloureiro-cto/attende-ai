import 'server-only';
import { connectDb } from './db';
import { listCatalog, type PlanCatalog } from './modules/billing/catalog';
import { dispatchAttende } from './routes';

/**
 * Calls an Attende route in process: same handler, same status and body as over HTTP, without a
 * round trip to this app's own URL. `path` is relative to `/api` (e.g. `/attende/entitlements`).
 */
export function attendeLocalFetch(path: string, init: { method?: string; headers?: Record<string, string>; body?: BodyInit | null } = {}): Promise<Response> {
  return dispatchAttende(new Request(`http://attende.internal/api${path}`, { method: init.method ?? 'GET', headers: init.headers, body: init.body ?? undefined }));
}

/**
 * The public plan catalog (`GET /api/attende/signup/plans`) read directly, for server-rendered pages: no per-IP rate
 * limit (every visitor of a page would share the server's), and the page caches it.
 */
export async function attendePlanCatalog(): Promise<PlanCatalog> {
  await connectDb();
  return listCatalog();
}
