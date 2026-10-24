/** Shapes of the JSYNQ CRM board table (`GET /api/crm/boards/:id/table*`), the same as the old funnel API. */
export type FunnelChannel = "whatsapp" | "instagram" | "sms"
export const FUNNEL_CHANNELS: readonly FunnelChannel[] = ["whatsapp", "instagram", "sms"]

export type StageKind = "open" | "won" | "lost"
export type FunnelStage = { id: string; name: string; color: string | null; order: number; kind: StageKind }
export type FunnelStageWithCount = FunnelStage & { count: number }

export type ConversationHandling = "ai_agent" | "qualifying" | "human" | "closed"

export type FunnelRow = {
  cardId: string
  title: string
  contact: { id: string; name: string | null; phone: string | null; email: string | null; avatarUrl: string | null } | null
  stage: FunnelStage | null
  deal: { value: number; currency: string; status: StageKind } | null
  owner: { id: string; name: string | null; avatarUrl: string | null } | null
  labels: Array<{ id: string; text: string; color: string | null }>
  sources: Array<{ id: string; text: string }>
  lastMessageAt: string | null
  conversation: { channel: FunnelChannel; id: string; sessionId: string | null; lastMessageAt: string | null; handling: ConversationHandling } | null
  createdAt: string
  updatedAt: string
}

export type FunnelPage = {
  items: FunnelRow[]
  nextCursor: string | null
  hasMore: boolean
  /** The conversation filters scan bounded windows: a `partial` page can be short or even empty while `hasMore` is true. */
  partial: boolean
  board: { id: string; projectId: string | null }
}

export type StagesData = {
  board: { id: string; projectId: string | null }
  stages: FunnelStageWithCount[]
  total: number
}

export type ContactRow = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  avatarUrl: string | null
  responsibleUserId: string | null
  deals: { total: number; open: number; won: number; lost: number }
  latestStage: FunnelStage | null
  latestCardId: string | null
  createdAt: string
  updatedAt: string
}

export type ContactsPage = { items: ContactRow[]; nextCursor: string | null; hasMore: boolean }
