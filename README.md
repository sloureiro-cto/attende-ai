# Attende-ai

Attende-ai is a customer-service and sales product for WhatsApp, Instagram and SMS: guided bot flows (the
automation editor), AI agents with their own knowledge, a shared inbox, a sales funnel (CRM), reports, team and
billing. It is a Next.js 14 (App Router) web app.

Attende-ai has no backend of its own. It consumes the **JSYNQ API** and signs users in against the JSYNQ user
base, so a running JSYNQ API (and access to its MongoDB) is required.

## How it talks to JSYNQ

| Piece | What it is |
| --- | --- |
| `BACKEND_URL` | JSYNQ API base URL used on the server (server components, server actions, route handlers). |
| `NEXT_PUBLIC_BACKEND_URL` | Same API as seen from the browser (direct uploads, realtime). Inlined at build time. |
| `MONGODB_URI` | JSYNQ MongoDB. NextAuth (`@auth/mongodb-adapter`) and a few server actions read it. |
| `AUTH_SECRET` | Encrypts the session cookie and signs the API token sent to the JSYNQ API. Must match the secret the API verifies. |

Login is NextAuth (Auth.js v5): e-mail and password (with the JSYNQ login code step) and Google. The session
cookie names are the app's own (`lib/auth/botsAuthCookies.ts`), so it never shares a cookie with JSYNQ.

## Run locally

Requirements: Node 22 and Yarn 1 (`yarn@1.22.22`).

```bash
yarn install
cp .env.example .env.local   # then fill in the values
yarn dev                     # http://localhost:3000
```

Other scripts:

```bash
yarn build        # production build
yarn start        # serve the build on port 3000
yarn typecheck    # tsc --noEmit
yarn test         # jest
```

`MONGODB_URI`, `AUTH_SECRET` and `STRIPE_SECRET_KEY` are checked when their modules load, so they must be set for
`yarn build` too. Pages also need a valid `STATSIG_SERVER_API_KEY` at runtime (the root layout bootstraps the
feature flags with it).

## Environment variables

Every variable is listed with a one-line description in [`.env.example`](.env.example). Summary:

- **JSYNQ API:** `BACKEND_URL`, `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_WEBSOCKET_SERVER` (optional)
- **Sign-in:** `MONGODB_URI`, `AUTH_SECRET`, `AUTH_URL` (optional), `AUTH_REDIRECT_PROXY_URL` (optional),
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Billing:** `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- **Feature flags:** `STATSIG_SERVER_API_KEY`, `STATSIG_PROJECT_ID`, `NEXT_PUBLIC_STATSIG_CLIENT_KEY`,
  `STATSIG_ENVIRONMENT`, `NEXT_PUBLIC_STATSIG_ENVIRONMENT`
- **WhatsApp embedded signup:** `NEXT_PUBLIC_META_APP_ID`, `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID`,
  `NEXT_PUBLIC_META_SDK_VERSION`, `WHATSAPP_LITE_QR_DEBUG`
- **Links and limits (optional):** `NEXT_PUBLIC_JSYNQ_URL`, `NEXT_PUBLIC_BOTS_CONTACT_EMAIL`,
  `NEXT_PUBLIC_BOTS_BOOKING_URL`, `NEXT_PUBLIC_ATTENDE_UPLOAD_MAX_MB`
- **Build (optional):** `NEXT_DIST_DIR`

`VERCEL_ENV` and `VERCEL_TARGET_ENV` are set by Vercel and only pick the Statsig environment.

Never commit `.env*` files other than `.env.example`.

## Layout

- `app/(bots)/` – every route of the product (login, signup, pricing, bots, ai-agents, inbox, funnel, reports, team, billing, ...)
- `components/bots-app/`, `lib/attende/`, `lib/bots-app/`, `actions/attende/` – the product's own code
- `components/automations/`, `lib/automations/` – the bot flow editor (reactflow)
- the other folders (`actions/`, `components/`, `lib/`, `app/_types`, `context/`, `hooks/`, ...) are support code
  that came from the JSYNQ frontend, kept at the same paths so the imports keep working
- `middleware.ts` – allow-list of public and signed-in routes; everything else is a 404, and every response is `noindex`

## Deploy (Vercel)

1. Import the repository as a Next.js project (install `yarn install`, build `yarn build`).
2. Node.js 22.x (from `engines`).
3. Add the variables from `.env.example` that apply, per environment (Production / Preview). `NEXT_PUBLIC_*`
   values are inlined at build time, so redeploy after changing them.
4. Point the app's domain at the project. The browser calls the JSYNQ API directly (uploads, realtime), so the
   API must accept that domain as an origin (CORS). Add `https://<domain>/api/auth/callback/google` to the
   Google OAuth client's redirect URIs, or set `AUTH_REDIRECT_PROXY_URL`.
5. The app is never indexed: the middleware and `next.config.js` send `X-Robots-Tag: noindex, nofollow`, and
   `/robots.txt` disallows everything.
