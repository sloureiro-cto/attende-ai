import 'server-only';
import { env } from '../config/env';

type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function minLevel(): Level {
  try {
    return env().LOG_LEVEL;
  } catch {
    return 'info';
  }
}

/**
 * One JSON line per event: `{"level":"info","time":"...","msg":"agent.created","workspaceId":"..."}`.
 * Pass ids and counts only: never tokens, keys, passwords, message text or card numbers.
 */
function write(level: Level, msg: string, data?: Record<string, unknown>) {
  if (ORDER[level] < ORDER[minLevel()]) return;
  let line: string;
  try {
    line = JSON.stringify({ level, time: new Date().toISOString(), msg, ...data });
  } catch {
    line = JSON.stringify({ level, time: new Date().toISOString(), msg, unserializable: true });
  }
  (level === 'error' || level === 'warn' ? process.stderr : process.stdout).write(`${line}\n`);
}

export const log = {
  debug: (msg: string, data?: Record<string, unknown>) => write('debug', msg, data),
  info: (msg: string, data?: Record<string, unknown>) => write('info', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => write('warn', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => write('error', msg, data),
};

export const errMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
