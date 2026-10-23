/**
 * Default stage names.
 *
 * A new workspace gets the platform's CRM board seeded with six stages (backend
 * `src/modules/columns/services/CreateDefaultColumnsService.ts`, reached from the Attende-ai signup through
 * `attende-signup/lib/ensureDefaultCrmProject.ts`). The seed writes the column title in the workspace language at
 * that moment, so a Portuguese workspace stores "Em Negociação" and an English one "In Negotiation".
 *
 * The API gives no stable id or "is default" flag for a stage (`GET /attende/funnel/stages` returns the column id,
 * title, color, order and kind only), so the rule is:
 *
 *   A stage is a seeded default when its name is EXACTLY one of the seeded titles below (in any of the three seed
 *   languages, same spelling, accents and case) AND its kind is the one the seed gives it. Such a stage is shown with
 *   the translated label of the user's language. Any other stage (including a renamed default, or a default whose
 *   status was changed) is the user's own text and is shown exactly as written.
 *
 * Keep the lists in sync with the backend seed.
 */
import type { StageKind } from "./types"

export type DefaultStageId = "leads" | "contacted" | "qualified" | "negotiation" | "won" | "lost"

const SEEDED: Record<DefaultStageId, { names: readonly string[]; kind: StageKind }> = {
  leads: { names: ["Leads"], kind: "open" },
  contacted: { names: ["Contacted", "Contatado", "Contactado"], kind: "open" },
  qualified: { names: ["Qualified", "Qualificado", "Calificado"], kind: "open" },
  negotiation: { names: ["In Negotiation", "Em Negociação", "En Negociación"], kind: "open" },
  won: { names: ["Win", "Ganho", "Ganado"], kind: "won" },
  lost: { names: ["Lost Lead", "Lead Perdido"], kind: "lost" },
}

const BY_NAME = new Map<string, { id: DefaultStageId; kind: StageKind }>()
for (const [id, { names, kind }] of Object.entries(SEEDED) as Array<[DefaultStageId, (typeof SEEDED)[DefaultStageId]]>) {
  for (const name of names) BY_NAME.set(name.normalize("NFC"), { id, kind })
}

/** Which seeded default this stage is, or `null` for a stage the user named (shown as written). */
export function defaultStageId(stage: { name: string; kind: StageKind } | null | undefined): DefaultStageId | null {
  if (!stage || typeof stage.name !== "string") return null
  const hit = BY_NAME.get(stage.name.normalize("NFC"))
  return hit && hit.kind === stage.kind ? hit.id : null
}

/** Translation keys of the default stages (see `lib/i18n/translations/attende/funnel.ts`). */
export const DEFAULT_STAGE_KEY = {
  leads: "stageDefaultLeads",
  contacted: "stageDefaultContacted",
  qualified: "stageDefaultQualified",
  negotiation: "stageDefaultNegotiation",
  won: "stageDefaultWon",
  lost: "stageDefaultLost",
} as const satisfies Record<DefaultStageId, string>

/** The label to show for a stage: translated for a seeded default, the user's text otherwise. */
export function stageLabel(stage: { name: string; kind: StageKind }, t: (key: (typeof DEFAULT_STAGE_KEY)[DefaultStageId]) => string): string {
  const id = defaultStageId(stage)
  return id ? t(DEFAULT_STAGE_KEY[id]) : stage.name
}
