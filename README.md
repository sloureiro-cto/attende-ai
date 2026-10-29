# Attende-ai

Attende-ai is a customer-service and sales product for WhatsApp, Instagram and SMS: AI agents with their own
knowledge, guided automations (the flow builder), a shared inbox, a sales funnel, reports, team and billing.

One repository, two processes:

- **The app** (Next.js 14, App Router): the pages, and the **Attende API** as route handlers (`app/api/`, domain code
  in `server/`): signup and trial, plans and billing (JSYNQ's own subscriptions, on JSYNQ's Stripe account), AI
  agent setup, advanced automations, the funnel and the reports. It has its own MongoDB (`ATTENDE_MONGODB_URI`) and three Vercel crons.
- **The worker** (`worker/`, same `server/` code): one always-on Node process that listens to JSYNQ, runs the
  automations, counts AI replies against the plan and assigns handoffs.

Users, sign-in, workspaces, channels, inbox, contacts and cards live in **JSYNQ**. Attende calls only routes that
exist on JSYNQ today, with the user's token or one the server signs with `AUTH_SECRET`; the list per feature, the
gaps and the operator steps are in [`docs/jsynq-apis-used.md`](docs/jsynq-apis-used.md).

## Run locally

Node 22 and Yarn 1. A running JSYNQ API (and its MongoDB, for sign-in) and an Attende MongoDB.

```bash
yarn install
cp .env.example .env.local   # fill in the values
yarn dev                     # the app and the Attende API, http://localhost:3000
yarn worker                  # the worker, in another terminal (health: http://localhost:8080/healthz)
```

The app calls its own Attende API in process (`lib/attende/serverApi.ts`): there is no API URL to configure.

```bash
yarn typecheck    # tsc --noEmit
yarn test         # jest: the app (jsdom) and the server (node, in-memory MongoDB, fake JSYNQ and Stripe)
yarn build        # production build; MONGODB_URI and AUTH_SECRET must be set (placeholders are enough):
MONGODB_URI=mongodb://localhost:27017/build AUTH_SECRET=build-placeholder-secret \
  NODE_OPTIONS=--max-old-space-size=6144 yarn build
```

Operational script: `yarn attende:migrate-from-jsynq --source <uri> [--apply]` (one-off copy of the old Attende data
out of JSYNQ). The plan catalog (JSYNQ plan slugs and Stripe price ids) is configuration:
`server/modules/billing/catalog.ts`.

## Environment

Every variable, with a one-line description, is in [`.env.example`](.env.example). Which ones are required, at build
or at runtime, on Vercel and on the worker: [`RUNBOOK.md`](RUNBOOK.md#environment). The worker needs only
`ATTENDE_MONGODB_URI`, `AUTH_SECRET` (the same as JSYNQ and the app) and `JSYNQ_API_URL`. Never commit `.env*` files
other than `.env.example`.

## Layout

- `app/api/` – the Attende API route handlers (plus NextAuth and the crons; no Stripe webhook); `server/routes.ts`
  lists them all, `server/` holds their server-only code (every file starts with `import 'server-only'`) and tests
- `worker/`, `server/modules/worker/` – the worker; `Dockerfile.worker` builds it
- `app/(bots)/` – every page (login, signup, pricing, bots, ai-agents, inbox, funnel, reports, team, billing, ...)
- `components/bots-app/`, `lib/attende/`, `lib/bots-app/`, `actions/attende/` – the product's own UI code
- `components/automations/`, `lib/automations/` – the automation builder (reactflow)
- the other folders are support code that came from the JSYNQ frontend, kept at the same paths
- `middleware.ts` – allow-list of public and signed-in routes; every response is `noindex`

## Docs

- [`RUNBOOK.md`](RUNBOOK.md) – deploy (Vercel, worker, MongoDB, Stripe), JSYNQ operator steps, smoke checklist,
  known limits
- [`docs/jsynq-apis-used.md`](docs/jsynq-apis-used.md) – every JSYNQ endpoint used, per feature, and what JSYNQ lacks
