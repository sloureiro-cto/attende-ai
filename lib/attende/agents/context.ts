import type { AgentForm, IndexStatus } from "./types"

/** A description shorter than this says too little about the business for the agent to answer from it. */
export const MIN_DESCRIPTION_CHARS = 60

export type BusinessContext = {
  /** The description is long enough on its own. */
  description: boolean
  /** Documents the knowledge pipeline already finished reading. */
  readyDocuments: number
  /** Documents still waiting or being read. */
  readingDocuments: number
  /** Enough to activate: a real description or at least one document already read. */
  enough: boolean
}

/**
 * The minimum the agent needs to know before it answers real customers: a description of a few sentences or a
 * document already processed. Creating a (paused) agent is always allowed; only activation waits for this.
 * A document whose status is unknown (lists that do not carry it) counts as present but not as read.
 */
export function businessContext(form: AgentForm, documents: ReadonlyArray<{ indexStatus?: IndexStatus }> = []): BusinessContext {
  const description = typeof form.businessDescription === "string" && form.businessDescription.trim().length >= MIN_DESCRIPTION_CHARS
  const readyDocuments = documents.filter((d) => d.indexStatus === "ready").length
  const readingDocuments = documents.filter((d) => d.indexStatus === undefined || d.indexStatus === "pending" || d.indexStatus === "processing").length
  return { description, readyDocuments, readingDocuments, enough: description || readyDocuments > 0 }
}
