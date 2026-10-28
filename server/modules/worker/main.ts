import 'server-only';
import { createServer, type Server } from 'http';
import mongoose from 'mongoose';
import { env, type Env } from '../../config/env';
import { connectDb } from '../../db';
import { userClient } from '../../lib/jsynq';
import { log } from '../../lib/logger';
import { Worker, type WorkerOptions } from './worker';

/** `JSYNQ_WS_URL`, else `JSYNQ_API_URL` with `ws(s)://` and path `/ws` (where JSYNQ's `WebSocketSyncServer` listens). */
export function jsynqWsUrl(e: Pick<Env, 'JSYNQ_API_URL' | 'JSYNQ_WS_URL'>): string {
  if (e.JSYNQ_WS_URL) return e.JSYNQ_WS_URL;
  const u = new URL(e.JSYNQ_API_URL);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  u.pathname = '/ws';
  u.search = '';
  return u.toString();
}

/** The automations runtime is on in the worker unless `ADVANCED_AUTOMATIONS_RUNTIME_ENABLED` says otherwise. */
export function runtimeEnabled(source: NodeJS.ProcessEnv, e: Pick<Env, 'ADVANCED_AUTOMATIONS_RUNTIME_ENABLED'>): boolean {
  const raw = source.ADVANCED_AUTOMATIONS_RUNTIME_ENABLED;
  return raw === undefined || raw === '' ? true : e.ADVANCED_AUTOMATIONS_RUNTIME_ENABLED;
}

export type RunningWorker = { worker: Worker; server: Server; port: number; stop: () => Promise<void> };

/**
 * Boots the worker process: Mongo, the health endpoint (`GET /healthz`: 200 while the process is up, with the lease
 * and socket status; `GET /readyz`: 200 when Mongo is connected), and the worker itself (lease, sockets, jobs).
 */
export async function runWorker(overrides: Partial<WorkerOptions> & { port?: number } = {}): Promise<RunningWorker> {
  const e = env();
  await connectDb();
  const worker = new Worker({
    deps: { user: userClient, now: () => new Date() },
    wsUrl: jsynqWsUrl(e),
    runtimeEnabled: runtimeEnabled(process.env, e),
    ...overrides,
  });
  const server = createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0];
    if (req.method === 'GET' && path === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ...worker.status() }));
      return;
    }
    if (req.method === 'GET' && path === '/readyz') {
      const ready = mongoose.connection.readyState === 1;
      res.writeHead(ready ? 200 : 503, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: ready }));
      return;
    }
    res.writeHead(404).end();
  });
  const port = overrides.port ?? e.WORKER_HEALTH_PORT;
  await new Promise<void>((resolve) => server.listen(port, resolve));
  const actual = (server.address() as { port: number }).port;
  worker.start();
  log.info('worker.started', { holder: worker.holder, port: actual, runtime: !!worker.automations });

  let stopping: Promise<void> | null = null;
  const stop = () =>
    (stopping ??= (async () => {
      log.info('worker.stopping', {});
      await worker.stop();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await mongoose.disconnect();
    })());
  return { worker, server, port: actual, stop };
}
