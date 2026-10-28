# Attende-ai runbook

How to deploy and operate Attende-ai: the Next.js app on Vercel (pages + the Attende API + crons) and the worker
(one always-on Node process). Both come from this repository and share `server/`. There is no separate backend
service any more.

```
browser ──► Vercel: Next.js app ──► /api/attende/*, /api/messaging-automations/advanced*  (route handlers, server/)
                 │      ▲                 │
                 │      └─ Vercel Cron ───┤  /api/cron/* (Bearer CRON_SECRET)
                 │                        ├──► Attende MongoDB (ATTENDE_MONGODB_URI)
Stripe ──────────┴─► /api/stripe/webhook  └──► JSYNQ API (existing routes only, docs/jsynq-apis-used.md)
worker (Render/Railway/Fly) ──► JSYNQ websocket + API, Attende MongoDB
```

## 1. Vercel project

1. Import the repository as a Next.js project. Install `yarn install`, build `yarn build`, Node.js 22.x (from
   `engines`).
2. **Plan: Vercel Pro.** The crons run every 10-15 minutes; Hobby allows one run per day. Function duration: the
   crons, the Stripe webhook and the funnel CSV export declare `maxDuration = 60` s.
3. Set the variables below per environment (Production / Preview), then deploy. `NEXT_PUBLIC_*` values are inlined
   at build time: redeploy after changing one.
4. Point the domain at the project. The browser calls the JSYNQ API directly (uploads, realtime), so JSYNQ must accept
   this origin (CORS). Add `https://<host>/api/auth/callback/google` to the Google OAuth client, or set
   `AUTH_REDIRECT_PROXY_URL`.

### Environment

"Build" = must be present when `yarn build` runs. "Runtime" = read by the functions. Every variable has a one-line
description in [`.env.example`](.env.example).

| Variable | When | Required | Notes |
| --- | --- | --- | --- |
| `MONGODB_URI` | build + runtime | yes | JSYNQ MongoDB (NextAuth adapter). Checked at module load. |
| `AUTH_SECRET` | build + runtime | yes | Same value as JSYNQ and the worker. Server-only. |
| `NEXT_PUBLIC_BACKEND_URL` | build | yes | JSYNQ API base (with `/api`) as the browser sees it. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | build | yes | Signup card step; same Stripe account as `STRIPE_SECRET_KEY`. |
| `NEXT_PUBLIC_STATSIG_CLIENT_KEY` | build | yes | Feature flags in the browser. |
| `NEXT_PUBLIC_META_APP_ID`, `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID` | build | yes, for WhatsApp Cloud API signup | |
| `NEXT_PUBLIC_WEBSOCKET_SERVER`, `NEXT_PUBLIC_META_SDK_VERSION`, `NEXT_PUBLIC_STATSIG_ENVIRONMENT`, `NEXT_PUBLIC_JSYNQ_URL`, `NEXT_PUBLIC_BOTS_CONTACT_EMAIL`, `NEXT_PUBLIC_BOTS_BOOKING_URL` | build | no | Defaults in `.env.example`. |
| `NEXT_PUBLIC_ATTENDE_UPLOAD_MAX_MB` | build | set it to `4` | See the upload note below. |
| `NEXT_DIST_DIR` | build | no | Local only (build beside `next dev`). |
| `ATTENDE_MONGODB_URI` | runtime | yes | The Attende database (section 3). |
| `JSYNQ_API_URL` | runtime | yes | JSYNQ API **origin** (paths start with `/api`). |
| `BACKEND_URL` | runtime | yes | JSYNQ API base **with** `/api` (server components and actions). |
| `FRONTEND_URL` | runtime | yes (or `AUTH_URL`) | `https://<host>`: the only billing-portal return origin. The Attende API refuses to start without one of the two. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | runtime | yes | Section 4. |
| `CRON_SECRET` | runtime | yes | At least 16 characters; without it every cron refuses to run. |
| `STATSIG_SERVER_API_KEY` | runtime | yes | The root layout bootstraps the flags with it; pages fail without a valid key. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | runtime | yes, for Google sign-in | |
| `AUTH_URL`, `AUTH_REDIRECT_PROXY_URL` | runtime | no | |
| `STATSIG_PROJECT_ID`, `STATSIG_ENVIRONMENT` | runtime | no | Environment defaults from `VERCEL_ENV`. |
| `JSYNQ_TIMEOUT_MS` (15000), `BILLING_GRACE_DAYS` (3), `AGENT_MODEL` (gpt-4o-mini), `EXTRA_DISPOSABLE_DOMAINS`, `LOG_LEVEL` (info), `WHATSAPP_LITE_QR_DEBUG` | runtime | no | Defaults in brackets. |
| `ADVANCED_AUTOMATIONS_RUNTIME_ENABLED`, `JSYNQ_WS_URL`, `WORKER_HEALTH_PORT` | — | not on Vercel | Worker only. |

`VERCEL_ENV` / `VERCEL_TARGET_ENV` are set by Vercel. `ATTENDE_PROCESS` is set by the worker itself; never set it.

### Crons (`vercel.json`)

| Path | Schedule | What it does |
| --- | --- | --- |
| `/api/cron/billing-reconcile` | every 15 min | Re-reads subscriptions from Stripe (missed webhooks), pauses or resumes agents (trial over, lapsed plan, AI-reply quota lifted in a new month or after an upgrade). |
| `/api/cron/agent-sweeper` | hourly | Removes JSYNQ agents and bindings left behind by an agent creation that died half way. |
| `/api/cron/reports` | every 10 min | Fallback for the worker's reports sync (both take the `job:reports` lease; a run within 9 min of the last one is skipped). |

Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. To run one by hand:
`curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/billing-reconcile`.

### Stripe webhook

Endpoint `https://<host>/api/stripe/webhook`, events `customer.subscription.created`, `.updated`, `.deleted`,
`.paused`, `.resumed`, `.trial_will_end`, `invoice.paid`, `invoice.payment_failed`. Copy its signing secret into
`STRIPE_WEBHOOK_SECRET`. Only subscriptions with `metadata.app = attende` are applied; others are acknowledged and
ignored. Nothing is registered in JSYNQ.

### Knowledge uploads: 4.5 MB

Agent documents go browser → Next.js route handler → Attende API. Vercel caps a function's request body at 4.5 MB,
although the Attende API accepts up to 20 MB. Set `NEXT_PUBLIC_ATTENDE_UPLOAD_MAX_MB=4` so the app refuses bigger
files with a clear message instead of a failed upload.

## 2. Worker

`worker/index.ts` (`yarn worker`): listens to JSYNQ per Attende workspace, runs the advanced automations, counts AI
replies against the quota, assigns handoffs ("quem assume") and syncs the reports every 10 minutes, for every
Attende workspace whose plan is active or trialing (re-read every minute). JSYNQ events and routes it uses:
`docs/jsynq-apis-used.md` ("Worker").

- **Image:** `Dockerfile.worker` (`docker build -f Dockerfile.worker -t attende-worker .`).
- **Env:** `ATTENDE_MONGODB_URI`, `AUTH_SECRET` (same as the app and JSYNQ), `JSYNQ_API_URL`; optional
  `JSYNQ_WS_URL` (default: `JSYNQ_API_URL` with `ws(s)://` and path `/ws`), `WORKER_HEALTH_PORT` (8080),
  `ADVANCED_AUTOMATIONS_RUNTIME_ENABLED` (unset = on), `JSYNQ_TIMEOUT_MS`, `LOG_LEVEL`. No Stripe keys, no
  `CRON_SECRET`, no `FRONTEND_URL`.
- **Health:** `GET /healthz` → 200 while the process is up, body `{leader, workspaces, socketsConnected, lastPollAt,
  eventsHandled}`. **Readiness:** `GET /readyz` → 200 when Mongo is connected. Use `/healthz` as the platform check.
- **One instance.** A Mongo lease (`worker_leases`, 30 s) lets only one instance work; a second one waits as a
  standby. Rolling deploys are safe: the old instance releases the lease on `SIGTERM` (graceful stop, forced exit at
  25 s) and the new one takes it within ~30 s. Do not scale it out.
- **Network:** outbound HTTPS and WSS to JSYNQ, and the Attende Mongo. Nothing calls it except the health check.
- **Logs:** one JSON line per event (ids and counts, never tokens or message text). Watch `worker.sync_failed`,
  `worker.poll_failed`.

**Failure modes:**

- Websocket down or an event missed: the safety poll (every 60 s, and after each reconnect) catches up.
- Worker down: automations do not answer, AI replies are not counted, handoffs are not assigned. On restart the poll
  catches up messages of the last 24 h; older ones are never replayed.
- JSYNQ down, or the owner left the workspace: calls fail and are logged (`worker.sync_failed`, `worker.poll_failed`);
  retried every minute.
- Two instances: the lease keeps one active; an instance that loses the lease stops working at once.
- `ADVANCED_AUTOMATIONS_RUNTIME_ENABLED=false` stops the automations (kill switch) and keeps the rest running.

**Recommended host: Render** (Docker web service): it builds the Dockerfile from the repository, runs a health check
on a path, and keeps the old instance until the new one is healthy. Railway and Fly work the same way.

Render (web service, Docker; a "background worker" has no health check):

```yaml
# render.yaml
services:
  - type: web
    name: attende-worker
    runtime: docker
    dockerfilePath: ./Dockerfile.worker
    plan: starter
    numInstances: 1
    healthCheckPath: /healthz
    envVars:
      - { key: ATTENDE_MONGODB_URI, sync: false }
      - { key: AUTH_SECRET, sync: false }
      - { key: JSYNQ_API_URL, sync: false }
```

Railway:

`railway.json`:

```json
{ "build": { "builder": "DOCKERFILE", "dockerfilePath": "Dockerfile.worker" },
  "deploy": { "numReplicas": 1, "healthcheckPath": "/healthz", "restartPolicyType": "ALWAYS" } }
```

Fly:

```toml
# fly.toml (then: fly secrets set ATTENDE_MONGODB_URI=... AUTH_SECRET=... JSYNQ_API_URL=...; fly scale count 1)
app = "attende-worker"
[build]
  dockerfile = "Dockerfile.worker"
[http_service]
  internal_port = 8080
  auto_stop_machines = "off"
  min_machines_running = 1
  [[http_service.checks]]
    method = "GET"
    path = "/healthz"
    interval = "15s"
    timeout = "5s"
```

## 3. Attende MongoDB (`ATTENDE_MONGODB_URI`)

Its own database, separate from the JSYNQ one (`MONGODB_URI`). It holds plans, signups, subscriptions,
entitlements, usage counters, agent setups and pauses, automations and their runs, reports, worker leases and
idempotency records.

- **One user with access to that database only** (the app and the worker can share it, or use one each):

  ```js
  use admin
  db.createUser({ user: "attende_app", pwd: passwordPrompt(), roles: [{ role: "readWrite", db: "attende" }] })
  ```

  The connection string names the database: `mongodb+srv://attende_app:<pwd>@<cluster>/attende?retryWrites=true&w=majority`.
  On Atlas: a database user with the built-in role `readWrite@attende`, and network access for Vercel and the
  worker host.
- **Backups:** turn on continuous backup (point-in-time restore) or daily snapshots kept at least 7 days, and
  restore one into a scratch database once before go-live. Without Atlas: a nightly
  `mongodump --uri "$ATTENDE_MONGODB_URI" --gzip --archive=attende-$(date +%F).gz` to off-site storage.
- **Moving data from the old setup:** `yarn attende:migrate-from-jsynq --source <jsynq uri>` (dry run), then with
  `--apply`. It only reads the JSYNQ database (use a read-only user) and only inserts what is missing.

## 4. Stripe

1. **Shared account with JSYNQ?** JSYNQ's own Stripe webhook answers 500 for a subscription it does not know, so
   every Attende subscription event would fail there and Stripe would retry it and eventually disable JSYNQ's
   endpoint. **JSYNQ PR #1361 must be merged and deployed before the first Attende subscription** on a shared
   account. With a separate Stripe account for Attende this does not apply.
2. Products and prices of the three tiers: product metadata `attende_tier=<slug>`, or price lookup keys starting with
   `<slug>_`.
3. Seed the plan catalog from Stripe, dry run first:

   ```bash
   ATTENDE_MONGODB_URI=... STRIPE_SECRET_KEY=... yarn attende:seed-plans          # prints what would change
   ATTENDE_MONGODB_URI=... STRIPE_SECRET_KEY=... yarn attende:seed-plans --apply  # writes the plans
   ```

   It never creates anything in Stripe. Re-run it after a price change.
4. Webhook endpoint and events: section 1.

## 5. JSYNQ operator steps

From [`docs/jsynq-apis-used.md`](docs/jsynq-apis-used.md#operator-steps-jsynq-side):

> 1. **Give every Attende workspace a JSYNQ plan with channels enabled.** Messaging gating in JSYNQ is fail-closed
>    without a JSYNQ subscription whose plan enables WhatsApp / Instagram / SMS (`rules.socialMedia`). There is no
>    existing admin route or tool that assigns a plan to one workspace: the admin console (`/api/admin/*`) is
>    read-only, and `POST /api/subscriptions/upgrade-to-trial` starts JSYNQ's own trial. A JSYNQ operator does it in
>    the JSYNQ database: point `workspaces.subscription` of the workspace at an active `subscriptions` document of a
>    plan whose `rules.socialMedia` enables the channels (plan documents missing those rules can be filled with
>    `yarn script run configure-plan-social-media-rules`, dry run first). The list of Attende workspaces is in the
>    Attende `entitlements` collection (and `yarn attende:migrate-from-jsynq` prints the migrated ones).
> 2. **`AUTH_SECRET` must be the same** in JSYNQ, in this app and in the worker: JSYNQ verifies the tokens the Attende
>    server mints with it.

Step 1 is needed for **every new signup** too, until JSYNQ has a way to do it: until then a new workspace cannot
connect a channel. Agree who does it and how fast before opening signups.

## 6. Smoke checklist after a deploy

Use a test e-mail and Stripe test mode on staging; on production, a real card refunded afterwards.

1. **Signup:** `/signup` → code e-mail (sent by JSYNQ) → verify → workspace created.
2. **Trial:** card step → trial starts; `/billing` shows the trial and its end date; `entitlements` has the workspace.
3. **JSYNQ operator step** (section 5) for that workspace.
4. **Connect a channel:** `/lines` → WhatsApp QR or Cloud API → "Connected".
5. **Create an agent:** `/ai-agents/new` → template → test chat answers.
6. **Go live:** the agent on that channel → "Live". With an active automation on the same channel it must be refused
   with the channel named.
7. **AI reply counted:** message the number from a phone → the agent answers → the AI-replies usage on `/billing`
   goes up by one within a minute (the reports count it after their next sync).
8. **Automation run:** on a second channel without an agent, turn on an automation (`/bots`) → message it → the
   automation's reply arrives in 1-2 s; its stats show one run.
9. **Handoff assigned:** reach a handoff (agent: ask for a person; or the automation's handoff step) → the
   conversation is in "Waiting for team" and assigned to the member set in the agent's setup within a minute.
10. **Funnel:** `/funnel` lists the deal of that contact; move it to another stage; export the CSV.
11. **Reports after ~10 min:** `/reports` leaves "Preparing", shows the conversations, and the page bar says
    "Updated about every 10 min" with the last update time.
12. **Cancel in Stripe:** cancel the subscription (immediately) in the dashboard → webhook 200 in Stripe's log →
    `/billing` shows it canceled → the agent is paused in JSYNQ (no reply to a new message).

Also check: worker `/healthz` says `leader: true` and `socketsConnected` equals the number of active workspaces; Vercel
shows the three crons succeeding.

## 7. Known limits

From `docs/jsynq-apis-used.md` ("Known limits" of the worker and "Gaps that need JSYNQ changes"); none is fixed by
this deploy:

- **Channels need a JSYNQ plan** assigned by hand (section 5).
- **Latency:** 1-2 s with the websocket up; up to 60 s when it drops, for SMS/Instagram outbound, and for state
  changes (handoff assignment).
- **History is not replayed:** messages older than 24 h, or than when the worker first watched the workspace.
- **AI quota is approximate:** JSYNQ never refuses an AI reply; a few can pass the limit before the agents pause, and
  replies sent while the worker is down more than 24 h are missed.
- **Automation messages look human to JSYNQ** (sent as the owner): counted as a person's replies, and seen by
  JSYNQ's `stopOnUserIntervention`.
- **First message detection** looks at the newest 30 messages only.
- **Not available:** WhatsApp template sends from automations (the step is disabled in the builder), creating a card
  for an unlinked conversation, handoff assignment by role.
- **Outbound cap** only covers what this app sends; **plan limits** are checked before JSYNQ actions, not inside
  JSYNQ (the JSYNQ web app or API can go over them).
- **Signup code e-mail** has JSYNQ's branding.
- **No per-agent tool restriction** in JSYNQ: it relies on the binding policy and the prompt.
- **Workspace deletion** is a soft delete in JSYNQ; what JSYNQ created with it stays.
- **Server-minted tokens act as the signup owner:** if that person leaves the workspace, pauses fail
  (`agents.pause_failed`) until an operator acts.
- **Funnel conversation filters** (channel, open conversation, handling) are hidden: no card list returns the card's
  conversation.
- **Reports** are computed from the inbox, ~10 minutes behind; after-hours share, opt-outs, satisfaction and AI
  resolution confirmed by the customer are not measured.
