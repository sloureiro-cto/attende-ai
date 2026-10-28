import 'server-only';
import dns from 'dns';
import https from 'https';
import { isPrivateAddress } from './privateAddress';
import { webhookUrlProblem } from './validateAdvancedAutomation';

export const WEBHOOK_TIMEOUT_MS = 5_000;
export const WEBHOOK_MAX_BODY_BYTES = 64 * 1024;

export type WebhookResult =
  | { ok: true; status: number }
  | { ok: false; error: string; status?: number };

/**
 * DNS lookup that refuses non-public addresses at CONNECT time. Validating the hostname once and
 * then letting the HTTP client resolve it again is a DNS-rebinding hole; doing the check inside
 * the connection's own lookup closes it: the address checked is the address used.
 */
export const publicOnlyLookup = ((
  hostname: string,
  options: dns.LookupOptions,
  callback: (
    err: NodeJS.ErrnoException | null,
    address?: string | dns.LookupAddress[],
    family?: number
  ) => void
) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = (addresses as dns.LookupAddress[]) ?? [];
    if (list.length === 0 || list.some((a) => isPrivateAddress(a.address))) {
      const blocked = new Error(
        'webhook host resolves to a non-public address'
      ) as NodeJS.ErrnoException;
      blocked.code = 'EBLOCKED';
      return callback(blocked);
    }
    if (options.all) return callback(null, list);
    return callback(null, list[0]!.address, list[0]!.family);
  });
}) as unknown as typeof dns.lookup;

/**
 * POSTs JSON to an author-configured URL, safely: https only, public hosts only (checked on the
 * connection itself), no redirects, short timeout, capped body, response body ignored.
 */
export function postWebhook(
  rawUrl: string,
  body: unknown,
  options: { timeoutMs?: number; lookup?: typeof dns.lookup } = {}
): Promise<WebhookResult> {
  const problem = webhookUrlProblem(rawUrl);
  if (problem) return Promise.resolve({ ok: false, error: `url ${problem}` });

  const payload = Buffer.from(JSON.stringify(body));
  if (payload.length > WEBHOOK_MAX_BODY_BYTES) {
    return Promise.resolve({ ok: false, error: 'payload too large' });
  }
  const url = new URL(rawUrl);

  return new Promise((resolve) => {
    // `timeout` below is an idle timeout only; this is the hard overall deadline.
    const deadline: NodeJS.Timeout = setTimeout(
      () => req.destroy(new Error('deadline')),
      (options.timeoutMs ?? WEBHOOK_TIMEOUT_MS) * 2
    );
    const req = https.request(
      {
        method: 'POST',
        hostname: url.hostname,
        port: 443,
        path: `${url.pathname}${url.search}`,
        lookup: options.lookup ?? publicOnlyLookup,
        timeout: options.timeoutMs ?? WEBHOOK_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': payload.length,
          'User-Agent': 'Attende-Automations/1.0',
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        clearTimeout(deadline);
        res.destroy(); // we never read the body: don't let a slow/endless one hold the socket
        // 3xx is a redirect we deliberately do not follow.
        resolve(
          status >= 200 && status < 300
            ? { ok: true, status }
            : { ok: false, status, error: `status ${status}` }
        );
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', (err) => {
      clearTimeout(deadline);
      resolve({ ok: false, error: err.message });
    });
    req.end(payload);
  });
}
