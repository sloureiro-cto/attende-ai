# Attende-ai runbook

How to deploy and operate Attende-ai: the Next.js app on Vercel (pages + the Attende API + crons) and the worker
(one always-on Node process). Both come from this repository and share `server/`. There is no separate backend
service any more.

```
browser ──► Vercel: Next.js app ──► /api/attende/*, /api/messaging-automations/advanced*  (route handlers, server/)
                 │      ▲                 │
                 │      └─ Vercel Cron ───┤  /api/cron/* (Bearer CRON_SECRET)
                 │                        ├──► Attende MongoDB (ATTENDE_MONGODB_URI)
                 │                        ├──► JSYNQ API (existing routes only, docs/jsynq-apis-used.md)
                 └────────────────────────┴──► Stripe (JSYNQ's account; JSYNQ's own webhook syncs JSYNQ)
worker (Render/Railway/Fly) ──► JSYNQ websocket + API, Attende MongoDB
```

## 1. Vercel project

1. Import the repository as a Next.js project. Install `yarn install`, build `yarn build`, Node.js 22.x (from
   `engines`).
2. **Plan: Vercel Pro.** The crons run every 10-15 minutes; Hobby allows one run per day. Function duration: the
   crons and the funnel CSV export declare `maxDuration = 60` s.
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
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | build | yes | Signup card step: **JSYNQ's live** publishable key (the form confirms JSYNQ's SetupIntent). |
| `NEXT_PUBLIC_STATSIG_CLIENT_KEY` | build | yes | Feature flags in the browser. |
| `NEXT_PUBLIC_META_APP_ID`, `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID` | build | yes, for WhatsApp Cloud API signup | |
| `NEXT_PUBLIC_WEBSOCKET_SERVER`, `NEXT_PUBLIC_META_SDK_VERSION`, `NEXT_PUBLIC_STATSIG_ENVIRONMENT`, `NEXT_PUBLIC_JSYNQ_URL`, `NEXT_PUBLIC_BOTS_CONTACT_EMAIL`, `NEXT_PUBLIC_BOTS_BOOKING_URL` | build | no | Defaults in `.env.example`. |
| `NEXT_PUBLIC_ATTENDE_UPLOAD_MAX_MB` | build | set it to `4` | See the upload note below. |
| `NEXT_DIST_DIR` | build | no | Local only (build beside `next dev`). |
| `ATTENDE_MONGODB_URI` | runtime | yes | The Attende database (section 3). |
| `JSYNQ_API_URL` | runtime | yes | JSYNQ API **origin** (paths start with `/api`). |
| `BACKEND_URL` | runtime | yes | JSYNQ API base **with** `/api` (server components and actions). |
| `FRONTEND_URL` | runtime | yes (or `AUTH_URL`) | `https://<host>`: the only billing-portal return origin. The Attende API refuses to start without one of the two. |
| `STRIPE_SECRET_KEY` | runtime | yes | **JSYNQ's live** Stripe secret key, server only. Section 4. No webhook secret. |
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
| `/api/cron/billing-reconcile` | every 15 min | Re-reads each workspace's JSYNQ subscription (`GET /api/subscriptions/me`, plus the cancel flag from Stripe), pauses or resumes agents (trial over, canceled, reactivated, AI-reply quota lifted in a new month or after an upgrade). The worker does the same every 5 min without Stripe. |
| `/api/cron/agent-sweeper` | hourly | Removes JSYNQ agents and bindings left behind by an agent creation that died half way. |
| `/api/cron/reports` | every 10 min | Fallback for the worker's reports sync (both take the `job:reports` lease; a run within 9 min of the last one is skipped). |

Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. To run one by hand:
`curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/billing-reconcile`.

### No Stripe webhook

Attende registers no Stripe endpoint. Subscriptions are JSYNQ's; JSYNQ's own webhook keeps its database and channel
gating in sync, and Attende re-reads `GET /api/subscriptions/me` (section 4).

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

## 4. Stripe (JSYNQ's account)

Attende bills through **JSYNQ's own subscriptions**, on JSYNQ's live Stripe account. Nothing is set up in Stripe for
Attende and nothing changes in JSYNQ.

1. **Plans already exist in JSYNQ production:** `attende-essencial`, `attende-profissional`, `attende-escala` (hidden
   from JSYNQ's catalog), each with two live flat prices (USD 39 / 79 / 199, BRL 197 / 397 / 997; tiered volume with
   one tier, so the member count JSYNQ sets as quantity never changes the price). Their ids are in
   `server/modules/billing/catalog.ts`. A price change is a new Stripe price plus a change of that file.
2. **Keys:** `STRIPE_SECRET_KEY` = JSYNQ's live secret key (server only), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` =
   JSYNQ's live publishable key. **Recommended next step: replace the secret key with a restricted key** limited to
   what Attende calls: Subscriptions write, Payment Methods read, Customer portal write (and nothing else). Attende
   never creates customers, subscriptions, prices or refunds.
3. **No webhook, and JSYNQ PR #1361 is not needed:** every subscription is created by JSYNQ itself
   (`POST /api/subscriptions/upgrade-to-trial`), so JSYNQ's webhook knows them all.
4. **What Attende does in Stripe** (only on a workspace's `attende-*` subscription, owner only): sets the trial to 7
   days right after JSYNQ creates it with 14 (`trial_end`, `proration_behavior: none`); "subscribe without trial" =
   `upgrade-to-trial` then `trial_end: now` (charged at once; a declined card changes nothing); cancel / resume
   (`cancel_at_period_end`); change plan (item price swap to the target tier's price in the same currency, prorated);
   the customer portal (card update, invoices). A workspace on a paid JSYNQ plan gets Attende included and its billing
   is never touched.
5. **Currency: USD for everyone, for now.** JSYNQ's `upgrade-to-trial` always uses the plan's USD price and Stripe
   cannot change a subscription's currency. The BRL prices are in the catalog marked `inUse: false`. Billing in BRL
   needs either creating the subscription with the workspace (`POST /api/workspaces` with `plan`, `currency: 'BRL'`,
   `stripePriceId`, `paymentMethodId`; it has no trial) or a JSYNQ change (a currency on `upgrade-to-trial`).
6. **Ended subscriptions** cannot be reactivated from Attende (JSYNQ's `upgrade-to-trial` refuses a workspace whose
   current subscription price is not the free plan's). The billing page sends the customer to support. Before the
   period ends, "Keep my subscription" undoes a cancellation.
7. **Trials:** one per mailbox and per card (Attende's `trial_claims`); a second one is refused at signup with the
   option to subscribe without a trial.

## 5. JSYNQ operator steps

From [`docs/jsynq-apis-used.md`](docs/jsynq-apis-used.md#operator-steps-jsynq-side):

> 1. **Channels come with the Attende plan.** A new signup's workspace is on a JSYNQ `attende-*` subscription, which
>    unlocks messaging while `trialing`/`active`. Only workspaces migrated from the old setup
>    (`yarn attende:migrate-from-jsynq` prints them) may still need a JSYNQ operator to point
>    `workspaces.subscription` at an active subscription of a plan whose `rules.socialMedia` enables the channels.
> 2. **`AUTH_SECRET` must be the same** in JSYNQ, in this app and in the worker: JSYNQ verifies the tokens the Attende
>    server mints with it.

New signups need no operator step: their channels unlock with the trial.

## 6. Smoke checklist after a deploy

Use a test e-mail on staging (JSYNQ staging and its Stripe test account, with test keys); on production, a real card
refunded afterwards.

1. **Signup:** `/signup` → code e-mail (sent by JSYNQ) → verify → workspace created.
2. **Trial:** card step → trial starts; `/billing` shows the trial and its end date; `entitlements` has the workspace.
3. **JSYNQ subscription:** in JSYNQ, the workspace is on `attende-<tier>`, `trialing`, trial end 7 days ahead.
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
12. **Cancel:** `/billing` → Cancel subscription → "Cancels on <date>" → Keep my subscription undoes it. On a test
    workspace, cancel it immediately in the Stripe dashboard → JSYNQ moves it to free → within 15 min `/billing` shows
    it ended (contact support) and the agent is paused in JSYNQ (no reply to a new message).

Also check: worker `/healthz` says `leader: true` and `socketsConnected` equals the number of active workspaces; Vercel
shows the three crons succeeding.

## 7. Known limits

From `docs/jsynq-apis-used.md` ("Known limits" of the worker and "Gaps that need JSYNQ changes"); none is fixed by
this deploy:

- **Billing in USD only** for now, and **no reactivation of an ended subscription** from the app (section 4).
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
