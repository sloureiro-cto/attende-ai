import dns from 'dns';
import { isPrivateAddress } from '../../modules/automations/lib/privateAddress';
import {
  postWebhook,
  publicOnlyLookup,
} from '../../modules/automations/lib/safeWebhook';

describe('isPrivateAddress', () => {
  it.each([
    '127.0.0.1',
    '127.255.255.254',
    '10.0.0.1',
    '10.255.255.255',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.0.1',
    '169.254.169.254',
    '169.254.0.1',
    '100.64.0.1',
    '100.127.255.255',
    '0.0.0.0',
    '192.0.0.1',
    '192.0.2.5',
    '198.18.0.1',
    '198.51.100.7',
    '203.0.113.9',
    '224.0.0.1',
    '240.0.0.1',
    '255.255.255.255',
    '::1',
    '::',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'ff02::1',
    '64:ff9b::7f00:1',
    '2001:db8::1',
    '::ffff:127.0.0.1',
    '::ffff:10.1.2.3',
    '::ffff:169.254.169.254',
    '::ffff:a00:1',
    '[::1]',
    'not-an-ip',
    '',
    '999.1.1.1',
  ])('blocks %s', (addr) => {
    expect(isPrivateAddress(addr)).toBe(true);
  });

  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '172.15.255.255',
    '172.32.0.1',
    '100.63.255.255',
    '100.128.0.1',
    '198.17.255.255',
    '198.20.0.1',
    '2606:4700:4700::1111',
    '2a00:1450:4001::200e',
    '::ffff:8.8.8.8',
  ])('allows public %s', (addr) => {
    expect(isPrivateAddress(addr)).toBe(false);
  });
});

describe('publicOnlyLookup (connect-time check, closes DNS rebinding)', () => {
  const lookupWith = (
    addresses: dns.LookupAddress[],
    error: NodeJS.ErrnoException | null = null
  ) =>
    jest
      .spyOn(dns, 'lookup')
      .mockImplementation(((
        _h: string,
        _o: unknown,
        cb: (...a: unknown[]) => void
      ) => cb(error, addresses)) as never);
  afterEach(() => jest.restoreAllMocks());

  const run = (opts: dns.LookupOptions = {}) =>
    new Promise<{
      err: NodeJS.ErrnoException | null;
      address?: unknown;
      family?: number;
    }>((resolve) =>
      publicOnlyLookup('hooks.example.com', opts, (err, address, family) =>
        resolve({ err, address, family })
      )
    );

  it('returns a public address (single and all)', async () => {
    lookupWith([{ address: '93.184.216.34', family: 4 }]);
    expect(await run()).toMatchObject({
      err: null,
      address: '93.184.216.34',
      family: 4,
    });
    expect((await run({ all: true })).address).toEqual([
      { address: '93.184.216.34', family: 4 },
    ]);
  });

  it('refuses when the host resolves to a private address', async () => {
    lookupWith([{ address: '10.0.0.5', family: 4 }]);
    expect((await run()).err?.code).toBe('EBLOCKED');
  });

  it('refuses when ANY resolved address is private (mixed answers)', async () => {
    lookupWith([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);
    expect((await run({ all: true })).err?.code).toBe('EBLOCKED');
  });

  it('refuses the cloud metadata address and IPv4-mapped IPv6 tricks', async () => {
    lookupWith([{ address: '169.254.169.254', family: 4 }]);
    expect((await run()).err?.code).toBe('EBLOCKED');
    lookupWith([{ address: '::ffff:169.254.169.254', family: 6 }]);
    expect((await run()).err?.code).toBe('EBLOCKED');
  });

  it('refuses an empty answer and passes resolver errors through', async () => {
    lookupWith([]);
    expect((await run()).err?.code).toBe('EBLOCKED');
    const nx = Object.assign(new Error('not found'), {
      code: 'ENOTFOUND',
    }) as NodeJS.ErrnoException;
    lookupWith([], nx);
    expect((await run()).err?.code).toBe('ENOTFOUND');
  });
});

describe('postWebhook input screening', () => {
  it.each([
    'http://example.com/x',
    'https://127.0.0.1/x',
    'https://localhost/x',
    'https://user:p@example.com/x',
    'https://example.com:8443/x',
    'ftp://example.com',
    'nonsense',
  ])('refuses %s without any network call', async (url) => {
    const spy = jest.spyOn(dns, 'lookup');
    const res = await postWebhook(url, { a: 1 });
    expect(res.ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('refuses an oversized payload', async () => {
    const res = await postWebhook('https://example.com/x', {
      big: 'x'.repeat(70 * 1024),
    });
    expect(res).toEqual({ ok: false, error: 'payload too large' });
  });

  it('reports a blocked host as a failure (never connects)', async () => {
    jest
      .spyOn(dns, 'lookup')
      .mockImplementation(((
        _h: string,
        _o: unknown,
        cb: (...a: unknown[]) => void
      ) => cb(null, [{ address: '10.0.0.9', family: 4 }])) as never);
    const res = await postWebhook(
      'https://internal-looking.example.com/hook',
      { a: 1 },
      { timeoutMs: 1000 }
    );
    expect(res.ok).toBe(false);
    jest.restoreAllMocks();
  });
});
