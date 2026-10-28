import 'server-only';
import { isIP } from 'net';

/**
 * True for any address a webhook must never reach: loopback, private, link-local (incl. the cloud
 * metadata address 169.254.169.254), CGNAT, multicast/reserved, and IPv6 equivalents. IPv4-mapped
 * IPv6 (`::ffff:10.0.0.1`) is unwrapped first, since that is the classic bypass.
 */
export function isPrivateAddress(address: string): boolean {
  const ip = address
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '');
  const family = isIP(ip);
  if (family === 0) return true; // not an IP at all: refuse rather than guess

  if (family === 6) {
    const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip);
    if (mapped) return isPrivateAddress(mapped[1]!);
    const hexMapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(ip);
    if (hexMapped) {
      const hi = parseInt(hexMapped[1]!, 16);
      const lo = parseInt(hexMapped[2]!, 16);
      return isPrivateAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
    if (ip === '::' || ip === '::1') return true;
    // Deprecated IPv4-compatible (::a.b.c.d / ::hhhh:hhhh), 6to4 and Teredo embed or tunnel to private IPv4.
    if (
      /^::[0-9a-f]{1,4}(?::[0-9a-f]{1,4})?$/.test(ip) ||
      /^::\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)
    )
      return true;
    if (/^2002:/.test(ip) || /^2001:0?:/.test(ip)) return true;
    const first = parseInt(ip.split(':')[0] || '0', 16);
    if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if ((first & 0xff00) === 0xff00) return true; // ff00::/8 multicast
    if (ip.startsWith('64:ff9b:')) return true; // NAT64 can reach IPv4 internals
    if (ip.startsWith('2001:db8:')) return true; // documentation range
    return false;
  }

  const [a = NaN, b = NaN, c = NaN] = ip.split('.').map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 169 && b === 254) return true; // link-local + metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && c === 0) return true; // IETF protocol assignments
  if (a === 192 && b === 0 && c === 2) return true; // TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // multicast + reserved + broadcast
  return false;
}
