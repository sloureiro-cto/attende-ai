/**
 * Auth.js cookie names for the standalone bots app. The bots app shares the user database and
 * AUTH_SECRET with JSYNQ (so the same credentials work and the backend accepts the apiToken) but it
 * must NOT share a session with it: distinct names, host-only (no `domain`), so the two apps never
 * read or overwrite each other's cookies even when served from sibling subdomains.
 *
 * Edge-safe on purpose (middleware imports it): no Node APIs, no env reads.
 */
export const BOTS_SESSION_COOKIE = "bots.session-token"

export const BOTS_AUTH_COOKIE_NAMES = {
  sessionToken: BOTS_SESSION_COOKIE,
  callbackUrl: "bots.callback-url",
  csrfToken: "bots.csrf-token",
  pkceCodeVerifier: "bots.pkce.code_verifier",
  state: "bots.state",
  nonce: "bots.nonce",
} as const

type CookieOptions = { httpOnly: true; sameSite: "lax"; path: "/"; secure: boolean }

/** Value for Auth.js' `cookies` option. `secure` is on everywhere except local development. */
export function botsAuthCookies(secure: boolean) {
  const options: CookieOptions = { httpOnly: true, sameSite: "lax", path: "/", secure }
  return {
    sessionToken: { name: BOTS_AUTH_COOKIE_NAMES.sessionToken, options },
    callbackUrl: { name: BOTS_AUTH_COOKIE_NAMES.callbackUrl, options },
    csrfToken: { name: BOTS_AUTH_COOKIE_NAMES.csrfToken, options },
    pkceCodeVerifier: { name: BOTS_AUTH_COOKIE_NAMES.pkceCodeVerifier, options },
    state: { name: BOTS_AUTH_COOKIE_NAMES.state, options },
    nonce: { name: BOTS_AUTH_COOKIE_NAMES.nonce, options },
  }
}
