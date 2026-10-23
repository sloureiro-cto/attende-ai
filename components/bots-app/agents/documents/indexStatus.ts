import type { IndexStatus } from "lib/attende/agents/types"

/** Labels and colors of the API's reading status (`indexStatus`). The label always carries the meaning, not the color. */
export const STATUS_KEY: Record<IndexStatus, "docsStatusPending" | "docsStatusProcessing" | "docsStatusReady" | "docsStatusFailed" | "docsStatusSkipped"> = { pending: "docsStatusPending", processing: "docsStatusProcessing", ready: "docsStatusReady", failed: "docsStatusFailed", skipped: "docsStatusSkipped" } as const
export const STATUS_TONE: Record<IndexStatus, string> = {
  pending: "bg-neutral-10 text-neutral-700",
  processing: "bg-info-clean text-info-darkest",
  ready: "bg-success-clean text-success-darkest",
  failed: "bg-error-clean text-error-darkest",
  skipped: "bg-neutral-10 text-neutral-600",
}
