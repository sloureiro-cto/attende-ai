import type { IInstagramConversation } from "actions/instagram-lite/types"
import { pickData } from "actions/parseBackendEnvelope"
import type { ISmsConversation } from "actions/sms-lite/types"
import type { WhatsAppConversation, WhatsAppSession } from "actions/whatsapp-lite/types"
import { FetchClient, HttpError } from "lib/client-api"
import { resolveBackendApiUrl } from "lib/resolveBackendApiUrl"
import type { InboxPipelineProjectOption } from "./inboxPipelineOptions"
import { EMPTY_INBOX_QUEUE_COUNTS, type InboxQueueViewCounts } from "./inboxQueueFilter"

export type InboxUnifiedChannel = "whatsapp" | "sms" | "instagram"

export type InboxUnifiedListRow = {
  channel: InboxUnifiedChannel
  sessionId: string
  sessionLabel: string
  conversation: WhatsAppConversation | ISmsConversation | IInstagramConversation
}

export type InboxUnifiedListMeta = {
  limit: number
  nextCursor: string | null
  hasMore: boolean
}

export type InboxOverview = {
  queueCounts: InboxQueueViewCounts
  crmProjects: InboxPipelineProjectOption[]
}

export type InboxUnifiedResult<T> =
  | { success: true; data: T; meta?: InboxUnifiedListMeta }
  | { success: false; error: string }

export type PartitionedInboxRows = {
  waRows: Array<{
    conversation: WhatsAppConversation
    sessionId: string
    sessionLabel: string
    sessionTransport?: WhatsAppSession["transport"]
    sessionCloudWabaId?: string | null
  }>
  smsRows: Array<{ conversation: ISmsConversation; sessionId: string; sessionLabel: string }>
  igRows: Array<{ conversation: IInstagramConversation; sessionId: string; sessionLabel: string }>
}

const CHANNELS: InboxUnifiedChannel[] = ["whatsapp", "sms", "instagram"]

export function inboxConversationsPath(workspaceId: string): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/messaging/inbox/conversations`
}

export function inboxOverviewPath(workspaceId: string): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}/messaging/inbox/overview`
}

export function inboxUnifiedRowKey(
  row: Pick<InboxUnifiedListRow, "channel" | "sessionId"> & { conversation: { _id: string } }
): string {
  return `${row.channel}::${row.sessionId}::${row.conversation._id}`
}

function isUnifiedChannel(value: unknown): value is InboxUnifiedChannel {
  return typeof value === "string" && CHANNELS.includes(value as InboxUnifiedChannel)
}

function parseUnifiedRow(value: unknown): InboxUnifiedListRow | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (!isUnifiedChannel(row.channel) || typeof row.sessionId !== "string" || !row.sessionId.trim()) return null
  const conversation = row.conversation
  if (!conversation || typeof conversation !== "object") return null
  const id = (conversation as { _id?: unknown })._id
  if (typeof id !== "string" || !id.trim()) return null
  // Server-computed SLA (all channels) travels on the conversation so it survives partitioning.
  const slaStatus = (row.sla as { status?: unknown } | undefined)?.status
  const inboxSlaStatus = slaStatus === "warning" || slaStatus === "critical" ? slaStatus : null
  return {
    channel: row.channel,
    sessionId: row.sessionId,
    sessionLabel: typeof row.sessionLabel === "string" && row.sessionLabel.trim() ? row.sessionLabel : row.sessionId,
    conversation: (inboxSlaStatus
      ? { ...(conversation as object), inboxSlaStatus }
      : conversation) as InboxUnifiedListRow["conversation"],
  }
}

/** SLA status the inbox list API stamped on a conversation (null = within SLA / no rules). */
export function inboxSlaStatusOf(conversation: unknown): "warning" | "critical" | null {
  const s = (conversation as { inboxSlaStatus?: unknown } | null)?.inboxSlaStatus
  return s === "warning" || s === "critical" ? s : null
}

export function parseInboxUnifiedList(raw: unknown): { data: InboxUnifiedListRow[]; meta: InboxUnifiedListMeta } {
  const data = pickData<unknown>(raw)
  const list = Array.isArray(data)
    ? data.map(parseUnifiedRow).filter((row): row is InboxUnifiedListRow => row != null)
    : []
  const metaRaw =
    raw && typeof raw === "object" && "meta" in raw ? (raw as { meta?: Record<string, unknown> }).meta : undefined
  const limit = typeof metaRaw?.limit === "number" && Number.isFinite(metaRaw.limit) ? metaRaw.limit : 30
  const nextCursor = typeof metaRaw?.nextCursor === "string" && metaRaw.nextCursor.trim() ? metaRaw.nextCursor : null
  const hasMore = typeof metaRaw?.hasMore === "boolean" ? metaRaw.hasMore : Boolean(nextCursor)
  return { data: list, meta: { limit, nextCursor, hasMore } }
}

function parseQueueCounts(value: unknown): InboxQueueViewCounts {
  const counts = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const num = (key: keyof InboxQueueViewCounts): number => {
    const raw = counts[key]
    return typeof raw === "number" && raw >= 0 ? raw : 0
  }
  return {
    all: num("all"),
    unread: num("unread"),
    needs_response: num("needs_response"),
    sla: num("sla"),
  }
}

function parseCrmProjects(value: unknown): InboxPipelineProjectOption[] {
  if (!Array.isArray(value)) return []
  return value
    .map((project) => {
      if (!project || typeof project !== "object") return null
      const row = project as Record<string, unknown>
      const id = typeof row.id === "string" ? row.id.trim() : ""
      if (!id) return null
      const columns = Array.isArray(row.columns)
        ? row.columns
            .map((column) => {
              if (!column || typeof column !== "object") return null
              const col = column as Record<string, unknown>
              const columnId = typeof col.id === "string" ? col.id.trim() : ""
              if (!columnId) return null
              return { id: columnId, title: typeof col.title === "string" && col.title.trim() ? col.title : columnId }
            })
            .filter((column): column is InboxPipelineProjectOption["columns"][number] => column != null)
        : []
      return {
        id,
        title: typeof row.title === "string" && row.title.trim() ? row.title : id,
        columns,
      }
    })
    .filter((project): project is InboxPipelineProjectOption => project != null)
}

export function parseInboxOverview(raw: unknown): InboxOverview {
  const data = pickData<Record<string, unknown>>(raw)
  return {
    queueCounts: parseQueueCounts(data?.queueCounts),
    crmProjects: parseCrmProjects(data?.crmProjects),
  }
}

export function emptyInboxOverview(): InboxOverview {
  return { queueCounts: { ...EMPTY_INBOX_QUEUE_COUNTS }, crmProjects: [] }
}

export function partitionInboxUnifiedRows(
  rows: InboxUnifiedListRow[],
  waSessions: Array<{
    _id: string
    transport?: WhatsAppSession["transport"]
    cloudApiConfig?: WhatsAppSession["cloudApiConfig"]
  }> = []
): PartitionedInboxRows {
  const byId = new Map(waSessions.map((session) => [session._id, session]))
  const waRows: PartitionedInboxRows["waRows"] = []
  const smsRows: PartitionedInboxRows["smsRows"] = []
  const igRows: PartitionedInboxRows["igRows"] = []

  for (const row of rows) {
    if (row.channel === "whatsapp") {
      const session = byId.get(row.sessionId)
      waRows.push({
        conversation: row.conversation as WhatsAppConversation,
        sessionId: row.sessionId,
        sessionLabel: row.sessionLabel,
        sessionTransport: session?.transport,
        sessionCloudWabaId: session?.cloudApiConfig?.wabaId,
      })
      continue
    }
    if (row.channel === "sms") {
      smsRows.push({
        conversation: row.conversation as ISmsConversation,
        sessionId: row.sessionId,
        sessionLabel: row.sessionLabel,
      })
      continue
    }
    igRows.push({
      conversation: row.conversation as IInstagramConversation,
      sessionId: row.sessionId,
      sessionLabel: row.sessionLabel,
    })
  }

  return { waRows, smsRows, igRows }
}

export function rowsToInboxUnifiedList(
  waRows: Array<{ conversation: WhatsAppConversation; sessionId: string; sessionLabel: string }>,
  smsRows: Array<{ conversation: ISmsConversation; sessionId: string; sessionLabel: string }>,
  igRows: Array<{ conversation: IInstagramConversation; sessionId: string; sessionLabel: string }>
): InboxUnifiedListRow[] {
  return [
    ...waRows.map((row) => ({
      channel: "whatsapp" as const,
      sessionId: row.sessionId,
      sessionLabel: row.sessionLabel,
      conversation: row.conversation,
    })),
    ...smsRows.map((row) => ({
      channel: "sms" as const,
      sessionId: row.sessionId,
      sessionLabel: row.sessionLabel,
      conversation: row.conversation,
    })),
    ...igRows.map((row) => ({
      channel: "instagram" as const,
      sessionId: row.sessionId,
      sessionLabel: row.sessionLabel,
      conversation: row.conversation,
    })),
  ]
}

export function mergeInboxUnifiedFirstPage(
  prev: InboxUnifiedListRow[],
  incoming: InboxUnifiedListRow[]
): InboxUnifiedListRow[] {
  const incomingKeys = new Set(incoming.map(inboxUnifiedRowKey))
  const tail = prev.filter((row) => !incomingKeys.has(inboxUnifiedRowKey(row)))
  return [...incoming, ...tail]
}

async function getInboxJson(
  path: string,
  query?: Record<string, string>
): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  const url = resolveBackendApiUrl(path)
  if (!url) {
    return { success: false, error: "NEXT_PUBLIC_BACKEND_URL is not configured" }
  }
  try {
    const raw = await FetchClient.get<unknown>(url, query && Object.keys(query).length > 0 ? { query } : undefined)
    return { success: true, data: raw }
  } catch (e: unknown) {
    if (e instanceof HttpError) return { success: false, error: e.message }
    return { success: false, error: "something went wrong" }
  }
}

export async function listInboxConversationsClient(
  workspaceId: string,
  query?: Record<string, string>
): Promise<InboxUnifiedResult<InboxUnifiedListRow[]>> {
  if (!workspaceId.trim()) return { success: false, error: "workspace is required" }
  const res = await getInboxJson(inboxConversationsPath(workspaceId), query)
  if (!res.success) return res
  const parsed = parseInboxUnifiedList(res.data)
  return { success: true, data: parsed.data, meta: parsed.meta }
}

export async function getInboxOverviewClient(
  workspaceId: string,
  query?: Record<string, string>
): Promise<InboxUnifiedResult<InboxOverview>> {
  if (!workspaceId.trim()) return { success: false, error: "workspace is required" }
  const res = await getInboxJson(inboxOverviewPath(workspaceId), query)
  if (!res.success) return res
  return { success: true, data: parseInboxOverview(res.data) }
}
