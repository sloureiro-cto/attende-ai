import type { AgentForm, AgentLine, TemplateKey } from "./types"

/** Wizard answers survive a refresh in sessionStorage (cleared when the tab closes, never shared across users on a device). */
export type AgentDraft = {
  templateKey: TemplateKey
  form: AgentForm
  lines: AgentLine[]
  /** Index in the wizard flow. */
  step: number
  /** Created once per draft so a retry of "Create agent" is idempotent on the backend. */
  clientRequestId: string
  /** The agent created from this draft, once it exists (the wizard continues on the "try it" step). */
  createdAgentId?: string
  /** Set by "Edit" on the review: the edited step offers "Back to review" instead of walking every step again. */
  returnToReview?: boolean
  /**
   * Names of the documents picked before the agent existed. The files themselves cannot be stored in the tab (they
   * are sent only after "Create agent"), so after a refresh the wizard can only list what has to be picked again.
   */
  docNames?: string[]
  savedAt: number
}

const PREFIX = "attende.agent.draft."
export const DRAFT_VERSION_KEY = `${PREFIX}v1`
const MAX_AGE_MS = 1000 * 60 * 60 * 24

const keyFor = (workspaceId: string | undefined, templateKey: TemplateKey) => `${PREFIX}${workspaceId ?? "ws"}.${templateKey}`

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">

const defaultStorage = (): StorageLike | null => {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage
  } catch {
    return null
  }
}

export function newRequestId(random: () => string = () => Math.random().toString(36).slice(2)): string {
  const cryptoId = typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID() : null
  return cryptoId ?? `req-${Date.now().toString(36)}-${random()}${random()}`
}

export function loadDraft(workspaceId: string | undefined, templateKey: TemplateKey, storage: StorageLike | null = defaultStorage(), now = Date.now()): AgentDraft | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(keyFor(workspaceId, templateKey))
    if (!raw) return null
    const draft = JSON.parse(raw) as AgentDraft
    if (!draft || draft.templateKey !== templateKey || typeof draft.form !== "object" || now - draft.savedAt > MAX_AGE_MS) return null
    return draft
  } catch {
    return null
  }
}

export function saveDraft(workspaceId: string | undefined, draft: Omit<AgentDraft, "savedAt">, storage: StorageLike | null = defaultStorage(), now = Date.now()): void {
  if (!storage) return
  try {
    storage.setItem(keyFor(workspaceId, draft.templateKey), JSON.stringify({ ...draft, savedAt: now }))
  } catch {
    // Quota or privacy mode: the wizard still works, it just will not survive a refresh.
  }
}

export function clearDraft(workspaceId: string | undefined, templateKey: TemplateKey, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.removeItem(keyFor(workspaceId, templateKey))
  } catch {
    // Ignore.
  }
}
