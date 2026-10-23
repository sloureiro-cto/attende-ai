import { createContext } from "react"

/** nodeId -> "Project · Column" for move-stage steps. Only those cards read it, and it changes only when a name resolves. */
export const BotStageLabelsContext = createContext<Record<string, string>>({})
