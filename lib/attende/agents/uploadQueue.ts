import { type FileIssue, maxUploadBytes, validateUpload } from "./files"
import type { AgentActionError, KnowledgeDocument } from "./types"

export type QueueStatus = "queued" | "uploading" | "done" | "failed"

export type QueueItem = {
  id: string
  file: File
  name: string
  size: number
  status: QueueStatus
  percent: number
  error?: AgentActionError
  document?: KnowledgeDocument
}

export type QueueState = { items: QueueItem[]; rejected: Array<{ name: string; issue: FileIssue }> }

export type QueueAction =
  | { type: "add"; files: File[]; existingNames: string[]; maxBytes?: number; idFor?: () => string }
  | { type: "start"; id: string }
  | { type: "progress"; id: string; percent: number }
  | { type: "done"; id: string; document: KnowledgeDocument }
  | { type: "failed"; id: string; error: AgentActionError }
  | { type: "retry"; id: string }
  | { type: "remove"; id: string }
  | { type: "clearRejected" }

export const initialQueue: QueueState = { items: [], rejected: [] }

let counter = 0
const defaultId = () => `file-${Date.now().toString(36)}-${(counter += 1)}`

export function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case "add": {
      const taken = [...action.existingNames, ...state.items.map((i) => i.name)]
      const items = [...state.items]
      const rejected: QueueState["rejected"] = []
      for (const file of action.files) {
        const issue = validateUpload(file, taken, action.maxBytes ?? maxUploadBytes())
        if (issue) {
          rejected.push({ name: file.name, issue })
          continue
        }
        taken.push(file.name)
        items.push({ id: (action.idFor ?? defaultId)(), file, name: file.name, size: file.size, status: "queued", percent: 0 })
      }
      return { items, rejected }
    }
    case "start":
      return patch(state, action.id, { status: "uploading", percent: 0, error: undefined })
    case "progress":
      return patch(state, action.id, { percent: Math.max(0, Math.min(100, Math.round(action.percent))) })
    case "done":
      return patch(state, action.id, { status: "done", percent: 100, document: action.document, error: undefined })
    case "failed":
      return patch(state, action.id, { status: "failed", error: action.error })
    case "retry":
      return patch(state, action.id, { status: "queued", percent: 0, error: undefined })
    case "remove":
      return { ...state, items: state.items.filter((i) => i.id !== action.id) }
    case "clearRejected":
      return { ...state, rejected: [] }
  }
}

const patch = (state: QueueState, id: string, change: Partial<QueueItem>): QueueState => ({
  ...state,
  items: state.items.map((i) => (i.id === id ? { ...i, ...change } : i)),
})

export const pendingItems = (state: QueueState): QueueItem[] => state.items.filter((i) => i.status === "queued")
export const hasActiveUploads = (state: QueueState): boolean => state.items.some((i) => i.status === "uploading")
