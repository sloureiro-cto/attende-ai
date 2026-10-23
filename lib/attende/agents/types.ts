/** Contract of `/api/attende/agents` (docs/attende/agents.md in the backend). Pure types: safe to import anywhere. */

export type LocalizedText = { pt: string; en: string; es: string }
export type AgentLanguage = keyof LocalizedText

export type TemplateKey = "sdr" | "closer" | "receptionist"
export const TEMPLATE_KEYS: readonly TemplateKey[] = ["sdr", "closer", "receptionist"]

export type FieldKind = "text" | "textarea" | "select" | "boolean" | "list" | "offerings" | "workingHours" | "faqs" | "objections" | "url" | "number"

export type FieldDescriptor = {
  /** Dot path inside the form, e.g. `sdr.qualificationQuestions`. */
  path: string
  kind: FieldKind
  label: LocalizedText
  help?: LocalizedText
  placeholder?: LocalizedText
  required?: boolean
  max?: number
  itemMax?: number
  min?: number
  options?: Array<{ value: string; label: LocalizedText }>
  /** Stored but does not change behavior yet. */
  informational?: boolean
}

export type TemplateStep = { key: string; title: LocalizedText; fields: FieldDescriptor[] }

export type TemplateChannel = { key: "whatsapp" | "instagram" | "sms"; available: boolean; beta: boolean }

export type AgentTemplate = {
  key: TemplateKey
  category: "sales" | "support"
  name: LocalizedText
  tagline: LocalizedText
  description: LocalizedText
  highlights: LocalizedText[]
  steps: TemplateStep[]
  defaults: Record<string, unknown>
  channels: TemplateChannel[]
}

export type WorkingDay = { day: number; open: string; close: string }
export type WorkingHours = { timezone: string; days: WorkingDay[] } | null
export type Offering = { name: string; description?: string; price?: string }
export type Faq = { question: string; answer: string }
export type Objection = { objection: string; answer: string }

/** The form is a loose JSON object driven by the template schema; typed accessors live in form.ts. */
export type AgentForm = Record<string, unknown>

export type AgentLine = { channel: "whatsapp" | "instagram" | "sms"; sessionId: string }
export type AgentLineView = AgentLine & { bindingId?: string; exists?: boolean; connected?: boolean; label?: string; active?: boolean }
export type CrmTarget = { projectId: string; columnId: string }

export type AgentStatus = "draft" | "paused" | "live"
export type AgentDocument = { documentId: string; name: string; mimeType: string; sizeBytes: number; uploadedAt: string }

export type AgentView = {
  id: string
  agentId: string
  templateKey: TemplateKey
  name: string
  status: AgentStatus
  form: AgentForm
  lines: AgentLineView[]
  crm?: CrmTarget | null
  documents: AgentDocument[]
  lastTestPassedAt?: string | null
  liveSince?: string | null
  createdAt: string
  updatedAt: string
  /** Only on the go-live response. */
  warnings?: Array<"not_tested" | "no_documents" | string>
}

export type IndexStatus = "pending" | "processing" | "ready" | "failed" | "skipped"
export type KnowledgeDocument = AgentDocument & { indexStatus: IndexStatus; pageCount?: number; errorMessage?: string }

export type TestCheck = { key: string; ok: boolean; severity: "blocking" | "info"; detail?: string }
export type TestResult = {
  mode: "dry_run"
  nothingSent: true
  passed: boolean
  wouldReply: boolean
  reason: "ok" | "outside_working_hours" | "handoff_requested" | "no_line_connected" | string
  handoff: { by: "keyword" | "builtin"; value: string } | null
  checks: TestCheck[]
  promptPreview?: string
}

export type CreateAgentInput = {
  templateKey: TemplateKey
  form: AgentForm
  lines: AgentLine[]
  clientRequestId: string
  crm?: CrmTarget
}

/** Stable backend codes (`details.code`). */
export const AGENT_ERROR_CODES = [
  "ATTENDE_AGENT_VALIDATION",
  "ATTENDE_AGENT_LINE_NOT_FOUND",
  "ATTENDE_AGENT_NOT_FOUND",
  "ATTENDE_AGENT_TEMPLATE_NOT_FOUND",
  "ATTENDE_QUOTA_EXCEEDED",
  "ATTENDE_AGENT_NOT_READY",
  "ATTENDE_AGENT_LINE_NOT_CONNECTED",
  "ATTENDE_AGENT_FILE_REJECTED",
  "ATTENDE_TRIAL_EXPIRED",
  "ATTENDE_SUBSCRIPTION_INACTIVE",
  "ATTENDE_NOT_ENTITLED",
  "ATTENDE_TRIAL_OUTBOUND_CAP",
] as const
export type AgentErrorCode = (typeof AGENT_ERROR_CODES)[number]

export type AgentErrorDetails = {
  issues?: Array<{ path: string; message: string }>
  channel?: string
  sessionId?: string
  /** `agents` | `docs` on the agents routes (docs/attende/agents.md). */
  resource?: "agents" | "docs" | string
  /** Same idea from the shared plan gate (entitlements-and-usage.md): `agents`, `docs`, `aiReplies`, `lines`… */
  quota?: string
  limit?: number
  used?: number
  reason?: string
  lines?: Array<{ channel: string; sessionId: string; exists: boolean }>
}

export type AgentActionError = { success: false; status: number; code?: string; message?: string; details?: AgentErrorDetails }
export type AgentActionResult<T> = { success: true; data: T } | AgentActionError
