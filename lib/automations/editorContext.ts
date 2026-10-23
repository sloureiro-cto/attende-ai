import type { IProject } from "app/_types/Project"
import type { AutomationChannel } from "./types"

export type SessionOption = {
  id: string
  label: string
  /** Phone number / @handle shown next to the label. */
  detail?: string
  selectable: boolean
}

/** Everything the rule editor and simulator need from the workspace, loaded once on the server. */
export type EditorContextData = {
  workspaceId: string
  sessions: Record<AutomationChannel, SessionOption[]>
  agents: Array<{ _id: string; name: string; icon?: string | null }>
  crmProjects: IProject[]
}

