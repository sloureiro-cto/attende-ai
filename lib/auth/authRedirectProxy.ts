/**
 * Canonical Auth.js prefix Google is allowed to redirect to.
 * Agency custom domains cannot be registered as Google `redirect_uri`s; Auth.js
 * sends Google to this stable URL, then bounces back to the white-label host.
 * Must include the Auth.js route (`/api/auth`), no trailing slash.
 */
export function googleOAuthRedirectProxyUrl(
  env: NodeJS.Dict<string> = process.env
): string | undefined {
  const raw = env.AUTH_REDIRECT_PROXY_URL?.trim()
  if (!raw) return undefined
  return raw.replace(/\/+$/, "")
}
