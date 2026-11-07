import {
  type AdvancedAutomationTrigger,
  type AdvancedAutomationTriggerKind,
  CONVERSATION_TRIGGER_KINDS,
  CRM_TRIGGER_KINDS,
  OTHER_TRIGGER_KINDS,
  TIME_TRIGGER_KINDS,
  TRIGGER_LIMITS,
} from "./types"

/** Trigger kinds by group, in the order the start inspector lists them. */
export const TRIGGER_GROUPS: Array<{
  id: "conversation" | "crm" | "time" | "other"
  kinds: readonly AdvancedAutomationTriggerKind[]
}> = [
  { id: "conversation", kinds: CONVERSATION_TRIGGER_KINDS },
  { id: "crm", kinds: CRM_TRIGGER_KINDS },
  { id: "time", kinds: TIME_TRIGGER_KINDS },
  { id: "other", kinds: OTHER_TRIGGER_KINDS },
]

export const isCrmTrigger = (kind: AdvancedAutomationTriggerKind) =>
  (CRM_TRIGGER_KINDS as readonly string[]).includes(kind)
export const isTimeTrigger = (kind: AdvancedAutomationTriggerKind) =>
  (TIME_TRIGGER_KINDS as readonly string[]).includes(kind)
/** Triggers whose run may be on a lead without a conversation (message steps are skipped then). */
export const runsOnLeads = (kind: AdvancedAutomationTriggerKind) =>
  isCrmTrigger(kind) || isTimeTrigger(kind) || kind === "webhook"

const hex24 = (v: unknown) => typeof v === "string" && /^[0-9a-f]{24}$/i.test(v)
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

/** A new kind keeps what every kind shares (filters, once per lead, the conversation dedupe) and drops the rest. */
export function withTriggerKind(
  trigger: AdvancedAutomationTrigger,
  kind: AdvancedAutomationTriggerKind
): AdvancedAutomationTrigger {
  const next: AdvancedAutomationTrigger = { kind, dedupeDays: trigger.dedupeDays }
  if (trigger.filter) next.filter = trigger.filter
  if (trigger.filters) next.filters = trigger.filters
  if (trigger.oncePerLead) next.oncePerLead = true
  if (kind === "contact_no_reply" || kind === "team_no_reply") next.minutes = 60
  if (kind === "scheduled") next.schedule = { frequency: "daily", time: "09:00" }
  if (kind === "date_field") next.dateField = { fieldId: "", offsetDays: -1, time: "09:00" }
  return next
}

/** Keywords typed one per line or comma separated. */
export function parseKeywords(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((k) => k.trim().slice(0, TRIGGER_LIMITS.keywordChars))
    .filter(Boolean)
    .slice(0, TRIGGER_LIMITS.keywords)
}

export type TriggerIssue =
  | "keywords_missing"
  | "minutes_invalid"
  | "board_missing"
  | "stage_missing"
  | "label_missing"
  | "schedule_invalid"
  | "date_field_missing"

/** What the trigger still needs before the automation can be turned on (same rules as the server). */
export function triggerIssues(trigger: AdvancedAutomationTrigger): TriggerIssue[] {
  const out: TriggerIssue[] = []
  switch (trigger.kind) {
    case "keyword":
      if (!trigger.keywords?.some((k) => k.trim())) out.push("keywords_missing")
      break
    case "contact_no_reply":
    case "team_no_reply": {
      const m = trigger.minutes ?? 0
      if (!Number.isInteger(m) || m < TRIGGER_LIMITS.silenceMinutesMin || m > TRIGGER_LIMITS.silenceMinutesMax)
        out.push("minutes_invalid")
      break
    }
    case "card_created":
    case "card_won":
    case "card_lost":
      if (!hex24(trigger.projectId) || !hex24(trigger.boardId)) out.push("board_missing")
      break
    case "card_stage_changed":
    case "webhook":
      if (!hex24(trigger.columnId)) out.push("stage_missing")
      break
    case "card_label_added":
      if (!trigger.labelText?.trim()) out.push("label_missing")
      break
    case "scheduled": {
      const s = trigger.schedule
      if (!hex24(trigger.columnId)) out.push("stage_missing")
      if (!s || !HHMM.test(s.time) || (s.frequency === "weekly" && !s.weekdays?.length)) out.push("schedule_invalid")
      break
    }
    case "date_field":
      if (!hex24(trigger.projectId) || !hex24(trigger.boardId)) out.push("board_missing")
      if (!trigger.dateField?.fieldId || !HHMM.test(trigger.dateField.time)) out.push("date_field_missing")
      break
    default:
      break
  }
  return out
}
