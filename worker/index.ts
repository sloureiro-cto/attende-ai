/**
 * The Attende always-on worker (phase 4): JSYNQ inbox websocket + safety poll, advanced automations runtime and
 * timers, AI-reply quota, handoff assignee, reports sync. Same repo and same `server/` code as the Next.js app.
 *
 *   yarn worker
 *
 * Needs ATTENDE_MONGODB_URI, AUTH_SECRET, JSYNQ_API_URL (optional: JSYNQ_WS_URL, WORKER_HEALTH_PORT,
 * ADVANCED_AUTOMATIONS_RUNTIME_ENABLED, LOG_LEVEL). See README "Worker".
 */
process.env.ATTENDE_PROCESS = 'worker';

const FORCE_EXIT_MS = 25_000;

async function main() {
  // Imported after ATTENDE_PROCESS is set: the env is parsed on first use.
  const { runWorker } = await import('../server/modules/worker/main');
  const running = await runWorker();
  const shutdown = (signal: string) => {
    process.stdout.write(`${JSON.stringify({ level: 'info', time: new Date().toISOString(), msg: 'worker.signal', signal })}\n`);
    const force = setTimeout(() => process.exit(1), FORCE_EXIT_MS);
    force.unref();
    running
      .stop()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({ level: 'error', time: new Date().toISOString(), msg: 'worker.boot_failed', error: error instanceof Error ? error.message : String(error) })}\n`);
  process.exit(1);
});
