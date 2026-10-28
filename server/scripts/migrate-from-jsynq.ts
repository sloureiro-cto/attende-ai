/**
 * One-off copy of the Attende data that used to live in the JSYNQ database into this service.
 *
 *   yarn attende:migrate-from-jsynq --source <jsynq mongo uri> [--source-db <name>]            dry run
 *   yarn attende:migrate-from-jsynq --source <jsynq mongo uri> [--source-db <name>] --apply    copy + sync
 *
 * Reads only (the JSYNQ database is never written; use a read-only user):
 *   attende_agent_setups (or attendee_agent_setups) -> agent_setups
 *   attendee_signups                                -> signups (verified / started / failed only)
 *   attendee_trial_claims (or trial_claims)         -> trial_claims
 *   workspaces.entitlements.attende                 -> entitlements
 *   plans with rules.bots.enabled                   -> plans (only slugs we do not have yet)
 *
 * Every write here is an insert-if-missing (`$setOnInsert`), so re-running is safe and never
 * overwrites newer data. Nothing is written to JSYNQ: the plan is enforced by this service (no
 * JSYNQ limits any more). The billing reconcile cron pauses the agents of migrated workspaces whose
 * access already ended. Each workspace still needs a JSYNQ plan with channels enabled, assigned by
 * a JSYNQ operator (docs/jsynq-apis-used.md, "Operator steps").
 */
import mongoose, { type Connection } from 'mongoose';
import { AgentSetupModel } from '../modules/agents/models';
import { EntitlementModel, PlanModel } from '../modules/billing/models';
import { SignupModel, TrialClaimModel } from '../modules/signup/models';

type Doc = Record<string, any>;
type Source = Connection['db'] & {};

export type MigrationReport = {
  apply: boolean;
  counts: Record<'agentSetups' | 'signups' | 'trialClaims' | 'entitlements' | 'plans', { found: number; inserted: number }>;
  /** Workspaces with Attende entitlements: each needs a JSYNQ plan with channels (operator step). */
  workspaces: string[];
};

const str = (v: unknown): string | undefined => (v === null || v === undefined ? undefined : String(v));
const MIGRATED_SIGNUP_STATES = new Set(['verified', 'trial_started', 'failed']);

async function firstExisting(db: Source, names: string[]): Promise<string | null> {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  return names.find((n) => existing.has(n)) ?? null;
}

async function readAll(db: Source, names: string[], filter: Doc = {}): Promise<Doc[]> {
  const name = await firstExisting(db, names);
  return name ? db.collection(name).find(filter).toArray() : [];
}

/** Inserts when missing; counts real inserts only. */
async function insertMissing(model: mongoose.Model<any>, filter: Doc, doc: Doc, apply: boolean): Promise<boolean> {
  if (!apply) return !(await model.exists(filter));
  const res = await model.updateOne(filter, { $setOnInsert: doc }, { upsert: true });
  return res.upsertedCount === 1;
}

export async function migrateFromJsynq(params: { source: Source; apply: boolean }): Promise<MigrationReport> {
  const { source, apply } = params;
  const report: MigrationReport = {
    apply,
    counts: {
      agentSetups: { found: 0, inserted: 0 },
      signups: { found: 0, inserted: 0 },
      trialClaims: { found: 0, inserted: 0 },
      entitlements: { found: 0, inserted: 0 },
      plans: { found: 0, inserted: 0 },
    },
    workspaces: [],
  };
  const bump = (k: keyof MigrationReport['counts'], inserted: boolean) => {
    report.counts[k].found += 1;
    if (inserted) report.counts[k].inserted += 1;
  };

  // Plans first: the entitlements below may name their tiers.
  for (const p of await readAll(source, ['plans'], { 'rules.bots.enabled': true })) {
    const bots = p.rules?.bots ?? {};
    const prices = (p.stripe?.prices ?? []).map((x: Doc) => ({
      id: x.id,
      currency: x.currency,
      interval: x.interval ?? x.recurring?.interval,
      intervalCount: x.intervalCount ?? x.interval_count ?? x.recurring?.interval_count ?? 1,
      amount: x.amount ?? x.unit_amount,
      active: x.active !== false,
    }));
    const doc = {
      slug: p.slug,
      title: p.title ?? p.name ?? p.slug,
      limits: { lines: bots.lines, agents: bots.agents, aiRepliesPerMonth: bots.aiRepliesPerMonth, seats: bots.seats, docs: bots.docs },
      stripeProductId: p.stripe?.products?.[0]?.id,
      prices: prices.filter((x: Doc) => x.id),
      active: p.active !== false,
    };
    bump('plans', await insertMissing(PlanModel, { slug: p.slug }, doc, apply));
  }

  const workspaces = await readAll(source, ['workspaces'], { 'entitlements.attende': { $exists: true, $ne: null } });
  for (const w of workspaces) {
    const e = w.entitlements.attende;
    const doc = {
      workspaceId: String(w._id),
      tier: e.tier,
      limits: e.limits,
      status: e.status,
      ...(e.trialEndsAt ? { trialEndsAt: e.trialEndsAt } : {}),
      ...(e.trialOutboundCap ? { trialOutboundCap: e.trialOutboundCap } : {}),
    };
    bump('entitlements', await insertMissing(EntitlementModel, { workspaceId: doc.workspaceId }, doc, apply));
  }

  const users = new Map<string, Doc>();
  const userOf = async (id: unknown) => {
    const key = str(id);
    if (!key) return undefined;
    if (!users.has(key)) users.set(key, (await source.collection('users').findOne({ _id: id as never }, { projection: { name: 1 } })) ?? {});
    return users.get(key);
  };
  for (const s of await readAll(source, ['attendee_signups'])) {
    if (!MIGRATED_SIGNUP_STATES.has(s.state)) {
      report.counts.signups.found += 1;
      continue;
    }
    const doc = {
      email: s.email,
      canonicalEmail: s.canonicalEmail,
      name: (await userOf(s.userId))?.name || s.businessName,
      businessName: s.businessName,
      locale: s.locale ?? 'pt',
      ...(s.planSlug ? { planSlug: s.planSlug } : {}),
      state: s.state,
      otpAttempts: 0,
      userId: str(s.userId),
      ...(s.workspaceId ? { workspaceId: str(s.workspaceId) } : {}),
      startAttempts: s.startAttempts ?? 0,
      ...(s.lastErrorRef ? { lastErrorRef: s.lastErrorRef } : {}),
      ...(s.trialEndsAt ? { trialEndsAt: s.trialEndsAt } : {}),
      createdAt: s.createdAt,
    };
    bump('signups', await insertMissing(SignupModel, { email: s.email }, doc, apply));
  }

  for (const c of await readAll(source, ['attendee_trial_claims', 'trial_claims'])) {
    const doc = { kind: c.kind, key: c.key, userId: str(c.userId), ...(c.workspaceId ? { workspaceId: str(c.workspaceId) } : {}), status: c.status ?? 'consumed' };
    bump('trialClaims', await insertMissing(TrialClaimModel, { kind: c.kind, key: c.key }, doc, apply));
  }

  for (const a of await readAll(source, ['attende_agent_setups', 'attendee_agent_setups'])) {
    const doc = {
      workspaceId: String(a.workspaceId),
      agentId: str(a.agentId),
      templateKey: a.templateKey,
      form: a.form,
      lines: (a.lines ?? []).map((l: Doc) => ({ channel: l.channel, sessionId: String(l.sessionId), ...(l.bindingId ? { bindingId: String(l.bindingId) } : {}) })),
      ...(a.crm ? { crm: { projectId: String(a.crm.projectId), columnId: String(a.crm.columnId) } } : {}),
      clientRequestId: a.clientRequestId,
      documents: (a.documents ?? []).map((d: Doc) => ({ ...d, documentId: String(d.documentId) })),
      state: 'ready',
      ...(a.lastTestPassedAt ? { lastTestPassedAt: a.lastTestPassedAt } : {}),
      ...(a.liveSince ? { liveSince: a.liveSince } : {}),
      createdBy: String(a.createdBy),
      createdAt: a.createdAt,
    };
    bump('agentSetups', await insertMissing(AgentSetupModel, { workspaceId: doc.workspaceId, clientRequestId: doc.clientRequestId }, doc, apply));
  }

  report.workspaces = workspaces.map((w) => String(w._id));
  return report;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const sourceUri = arg('--source');
  if (!sourceUri) throw new Error('--source <JSYNQ mongo uri> is required');
  const apply = process.argv.includes('--apply');
  const { env } = await import('../config/env');
  await mongoose.connect(env().ATTENDE_MONGODB_URI);
  const sourceConn = await mongoose.createConnection(sourceUri, { readPreference: 'secondaryPreferred', autoIndex: false, autoCreate: false }).asPromise();
  const dbName = arg('--source-db');
  const source = (dbName ? sourceConn.useDb(dbName, { useCache: true }).db : sourceConn.db) as Source;
  try {
    const report = await migrateFromJsynq({ source, apply });
    for (const [k, v] of Object.entries(report.counts)) console.log(`${k.padEnd(12)} found ${v.found}, ${apply ? 'inserted' : 'would insert'} ${v.inserted}`);
    console.log(`\n${report.workspaces.length} Attende workspace(s). Each needs a JSYNQ plan with channels enabled (operator step):`);
    for (const id of report.workspaces) console.log(`  ${id}`);
    console.log(apply ? '\nApplied.' : '\nDry run: nothing written. Re-run with --apply.');
  } finally {
    await sourceConn.close();
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
