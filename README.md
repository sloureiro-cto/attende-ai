# Attende-ai

Attende-ai is a customer-service and sales product for WhatsApp, Instagram and SMS: guided bot flows (the
automation editor), AI agents with their own knowledge, a shared inbox, a sales funnel (CRM), reports, team and
billing. It is a Next.js 14 (App Router) web app.

Attende-ai talks to two APIs, always with the signed-in user's token (`session.apiToken`, as Bearer):

- the **Attende API**, served by this app (route handlers in `app/api/`, domain code in `server/`, moved from
  [`attend-ai-backend`](https://github.com/sloureiro-cto/attend-ai-backend)): signup and trial, plan and entitlements,
  Stripe billing, AI agent setup, advanced automations, the funnel and the reports. It has its own MongoDB (`ATTENDE_MONGODB_URI`);
- the **JSYNQ API**: users and sign-in, workspaces, channels, inbox, contacts and cards. The Attende API also calls it, only through routes
  that exist on JSYNQ today (no partner API): JSYNQ's public signup routes, and its user routes with the user's token
  or one the server mints with `AUTH_SECRET`. The full list, per feature, is in
  [`docs/jsynq-apis-used.md`](docs/jsynq-apis-used.md), with the operator steps JSYNQ needs.

A running JSYNQ API (and access to its MongoDB, for sign-in) and an Attende MongoDB are required.

## How it talks to the APIs

| Piece | What it is |
| --- | --- |
| Attende API | Served here; server actions call its route handlers in process (`callAttende` in `lib/attende/serverApi.ts`), with the user's token, same paths and bodies as over HTTP. Optional `ATTENDE_API_URL` (base including `/api`) sends those calls over HTTP to another deployment instead. |
| `ATTENDE_MONGODB_URI` | The Attende database (plans, signups, subscriptions, entitlements, usage counters, agent pauses, agent setups, automations). Not the JSYNQ database. |
| `BACKEND_URL` | JSYNQ API base URL used on the server (server components, server actions, route handlers). The funnel's deal details (contact, checklist, comments, attachments, stages settings) call it directly; the funnel table and the reports go through the Attende API (`/api/attende/funnel*`, `/api/attende/reports/*`). |
| `NEXT_PUBLIC_BACKEND_URL` | Same API as seen from the browser (direct uploads, realtime). Inlined at build time. |
| `MONGODB_URI` | JSYNQ MongoDB. NextAuth (`@auth/mongodb-adapter`) and a few server actions read it. |
| `AUTH_SECRET` | Encrypts the session cookie and signs the API token sent to the JSYNQ API. Must match the secret the API verifies. The Attende API signs the same token (`lib/auth/apiToken.ts`) to act as a member when nobody is signed in (start-trial, Stripe webhooks, crons). |

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

`MONGODB_URI` and `AUTH_SECRET` are checked when their modules load, so they must be set for `yarn build` too
(placeholders are enough for a local build check):

```bash
MONGODB_URI=mongodb://localhost:27017/build AUTH_SECRET=build-placeholder \
  NODE_OPTIONS=--max-old-space-size=6144 yarn build
```

The Attende API reads its variables on the first request, not at build time.

Pages also need a valid `STATSIG_SERVER_API_KEY` at runtime (the root layout bootstraps the feature flags with it).

## Attende API (`server/`, `app/api/`)

`server/` is server-only (every file starts with `import 'server-only'`; a client import fails the build). It holds
the modules (`signup`, `billing`, `agents`, `automations`), the Mongoose models, the JSYNQ client
(`server/lib/jsynq`: public signup routes, user routes, the server-minted token) and the auth (user JWT verified locally with `AUTH_SECRET`, membership checked with
JSYNQ and cached 60 s). `server/routes.ts` lists every route; `app/api/**/route.ts` exports the same handlers (a test
keeps them in sync), and `server/lib/http.ts` is the shared wrapper (DB connect, guards, error body).

Errors have one shape: `{error, code, message, reference?, details?}`; agent errors also carry the code in
`details.code`.

| Method | Path | Auth |
|---|---|---|
| GET | `/api/attende/signup/plans` | public |
| POST | `/api/attende/signup`, `/signup/verify`, `/signup/resend` | public, rate limited |
| POST | `/api/attende/signup/setup-intent`, `/signup/start-trial` | user |
| GET | `/api/attende/entitlements`, `/api/attende/billing/invoices` | user + workspace |
| POST | `/api/attende/billing/portal` | user + workspace |
| POST | `/api/attende/limits/check`, `/api/attende/usage/outbound` | user + workspace (the app's own plan checks before channel, invite and send actions) |
| GET/POST/PATCH/DELETE | `/api/attende/agents/*` (templates, from-template, `:id`, setup, go-live, pause, test, knowledge) | user + workspace + plan |
| GET/POST/PATCH/DELETE | `/api/messaging-automations/advanced*` (list, create, preview, `:id`, stats, stats/series) | user + workspace + plan |
| GET/PATCH | `/api/attende/funnel` (deals), `/funnel/stages`, `/funnel/contacts`, `/funnel/export.csv`, `PATCH /funnel/:cardId/stage`, `/funnel/:cardId/conversation` | user + workspace + plan (JSYNQ checks board access with the user's token) |
| GET | `/api/attende/reports/overview`, `/reports/agents`, `/reports/outcomes` | user + workspace + plan |
| POST | `/api/stripe/webhook` | Stripe signature (`STRIPE_WEBHOOK_SECRET`) |
| GET | `/api/cron/billing-reconcile` (every 15 min), `/api/cron/agent-sweeper` (hourly), `/api/cron/reports` (every 10 min) | `Authorization: Bearer <CRON_SECRET>` (Vercel Cron, `vercel.json`) |

The middleware lets these paths through without a session cookie: each route authenticates itself.

The plan is enforced here, not in JSYNQ: channels, agents, documents and seats are counted from JSYNQ's own lists
before each create; AI replies and sent messages are counted locally; a trial that ends, a canceled subscription or
the AI-reply quota pause the workspace's agent bindings in JSYNQ, and they resume on reactivation or the next month.

The advanced automations runtime (`server/modules/automations/runtime/`: inbound handling, waits and timers) is
not run by Next.js: the worker runs it (below).

Tests: `yarn test:server` (node, dummy env from `server/test/setupEnv.ts`, in-memory MongoDB, fake JSYNQ and Stripe;
no secrets). The integration tests drive the same route handlers through `server/test/helpers/app.ts`.

Operational scripts (run with `tsx --conditions=react-server`, so `server-only` resolves on plain Node):
`yarn attende:seed-plans [--apply]`, `yarn attende:migrate-from-jsynq --source <uri> [--apply]`.

## Worker (`worker/`, `server/modules/worker/`)

A small always-on Node process from the same repo and the same `server/` code. Run it with `yarn worker`
(`tsx --conditions=react-server worker/index.ts`), or build `Dockerfile.worker` (Render, Railway, Fly).

What it does, for every Attende workspace whose plan is active or trialing (the list is re-read every minute, so
new and lapsed workspaces are picked up or dropped):

- **Listens to JSYNQ:** one websocket per workspace on `messaging-inbox:<workspaceId>`, as the workspace owner
  (`subscriptions.userId`) with a token it mints with `AUTH_SECRET` (1 h, refreshed by a new handshake every 45 min).
  Reconnects with backoff (1 s to 30 s).
- **Safety poll every 60 s** (and right after every reconnect): the inbox conversations whose `lastMessageAt` moved
  since the last poll, and the unassigned `human_handoff` conversations. Both paths read the conversation's newest
  messages and emit each message once (`worker_seen_messages`, TTL 7 days): inbound message, message sent (AI agent,
  JSYNQ automation, a person, or the worker itself), conversation state.
- **Advanced automations:** inbound messages go to the runtime (`onInboundMessage`, with the full text from the
  messages endpoint); waits and no-reply timeouts tick every 15 s. The gateway acts on JSYNQ's existing routes (send
  message, move the linked card, labels, card fields, handoff to people or to an AI agent); see
  `docs/jsynq-apis-used.md`. `ADVANCED_AUTOMATIONS_RUNTIME_ENABLED=false` turns the runtime off (unset = on in the
  worker; Next.js never runs it).
- **AI-reply quota:** every AI agent reply it sees calls `recordAiReply()`; at the plan's limit the agents' bindings
  are paused (the reconcile cron lifts it next month or after an upgrade).
- **"Quem assume":** a conversation an Attende agent was answering that enters `human_handoff` without an assignee is
  assigned to the member set in the agent's setup (`form.handoff.target`, `kind: 'user'`). An existing assignee is
  never replaced; a member who left is skipped.
- **Reports:** `runReportsSync` every 10 min. The Vercel cron stays as a fallback: both take the `job:reports` lease
  and skip a run within 9 minutes of the previous one.

**One active instance.** A Mongo lease (`worker_leases`, `_id: 'worker'`, 30 s, renewed every 10 s) decides which
instance works; another deployed instance is a standby that takes over within ~30 s of the active one dying.
`SIGTERM`/`SIGINT` stop it gracefully (sockets closed, in-flight work finished, lease released; forced exit at 25 s).

**Health:** `GET /healthz` on `WORKER_HEALTH_PORT` (default 8080) answers 200 with `{leader, workspaces,
socketsConnected, lastPollAt, eventsHandled}`; `GET /readyz` is 200 when Mongo is connected.

**Environment:** `ATTENDE_MONGODB_URI`, `AUTH_SECRET` (the same as JSYNQ and the app), `JSYNQ_API_URL`; optional
`JSYNQ_WS_URL` (default: `JSYNQ_API_URL` with `ws(s)://` and path `/ws`), `WORKER_HEALTH_PORT`,
`ADVANCED_AUTOMATIONS_RUNTIME_ENABLED`, `JSYNQ_TIMEOUT_MS`, `LOG_LEVEL`. The worker does not need the Stripe keys or
`FRONTEND_URL`.

**Deploy notes:** one instance is enough (a second one only waits). It needs outbound access to JSYNQ (HTTPS and
WSS) and to the Attende Mongo; nothing calls it except the platform's health check. Logs are one JSON line per event
(ids and counts only, never tokens or message text).

**Failure modes:**

- Latency is 1-2 s from a contact's message to the automation's reply while the websocket is up; up to ~60 s (the
  safety poll) when it drops or misses an event. Handoff assignment is up to 60 s for a handoff without an AI reply
  (JSYNQ sends no websocket event for a state change).
- Worker down: nothing is answered by automations, AI replies are not counted, handoffs are not assigned; on restart
  the poll catches up messages of the last 24 h (older ones are history and are never replayed).
- JSYNQ down or the owner left the workspace: calls fail and are logged (`worker.sync_failed`, `worker.poll_failed`);
  the poll retries every minute.
- Two instances: the lease keeps one active; a lost lease stops the work at once.

## Environment variables

Every variable is listed with a one-line description in [`.env.example`](.env.example). Summary:

- **Attende API:** `ATTENDE_MONGODB_URI`, `FRONTEND_URL` (optional, defaults to `AUTH_URL`), `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `BILLING_GRACE_DAYS`, `JSYNQ_API_URL`, `JSYNQ_TIMEOUT_MS`, `AGENT_MODEL`,
  `EXTRA_DISPOSABLE_DOMAINS`, `CRON_SECRET`, `LOG_LEVEL`, `ATTENDE_API_URL` (optional); it also uses `AUTH_SECRET`
- **Worker:** `ATTENDE_MONGODB_URI`, `AUTH_SECRET`, `JSYNQ_API_URL`, `JSYNQ_WS_URL` (optional), `WORKER_HEALTH_PORT`
  (default 8080), `ADVANCED_AUTOMATIONS_RUNTIME_ENABLED` (default on in the worker)
- **JSYNQ API:** `BACKEND_URL`, `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_WEBSOCKET_SERVER` (optional)
- **Sign-in:** `MONGODB_URI`, `AUTH_SECRET`, `AUTH_URL` (optional), `AUTH_REDIRECT_PROXY_URL` (optional),
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Billing:** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (card form of the signup; same Stripe account as `STRIPE_SECRET_KEY`)
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

- `app/api/` – the Attende API route handlers (plus NextAuth); `server/` – their server-only code and tests
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
   API must accept that domain as an origin (CORS). `FRONTEND_URL` (or `AUTH_URL`) is this domain: it is the only
   origin the billing portal returns to. Add `https://<domain>/api/auth/callback/google` to the
   Google OAuth client's redirect URIs, or set `AUTH_REDIRECT_PROXY_URL`.
5. Attende API: set `CRON_SECRET` (Vercel Cron sends it; the jobs are in `vercel.json`). In Stripe, point a webhook
   endpoint at `https://<domain>/api/stripe/webhook` (events `customer.subscription.*`, `invoice.paid`,
   `invoice.payment_failed`) and set `STRIPE_WEBHOOK_SECRET`. Nothing is registered in JSYNQ. Knowledge uploads go
   through a route handler; Vercel caps request bodies at 4.5 MB.
7. JSYNQ operator: each Attende workspace needs a JSYNQ plan with channels enabled (see "Operator steps" in
   [`docs/jsynq-apis-used.md`](docs/jsynq-apis-used.md)).
8. The app is never indexed: the middleware and `next.config.js` send `X-Robots-Tag: noindex, nofollow`, and
   `/robots.txt` disallows everything.
