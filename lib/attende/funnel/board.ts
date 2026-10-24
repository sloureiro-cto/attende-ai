import { auth } from "auth"
import type { AttendeActionResult } from "lib/attende/result"
import { jsynqGet } from "lib/attende/serverApi"

const ID_RE = /^[a-f0-9]{24}$/i

// --- the funnel board ------------------------------------------------------------------------------
// The funnel is the workspace's default CRM board, read through JSYNQ's generic table endpoints with the user's token:
// `GET /crm/boards/default`, then `/crm/boards/:id/table[/stages|/contacts|/export.csv]`, and
// `PATCH /crm/cards/:id/column` for a stage move. A user who cannot open that board gets 404 (FunnelNoBoard).

const BOARD_TTL_MS = 60_000
const BOARD_CACHE_MAX = 500
const boardCache = new Map<string, { boardId: string; projectId: string; expires: number }>()

const boardCacheKey = async (): Promise<string | null> => {
  const session = await auth()
  return session?.user?.id && session.user.workspaceId ? `${session.user.id}:${session.user.workspaceId}` : null
}

/** The default CRM board of the session's workspace (`{boardId, projectId}`), cached for a minute per user and workspace. */
async function defaultBoard(): Promise<AttendeActionResult<{ boardId: string; projectId: string }>> {
  const key = await boardCacheKey()
  const hit = key ? boardCache.get(key) : undefined
  if (hit && hit.expires > Date.now())
    return { success: true, data: { boardId: hit.boardId, projectId: hit.projectId } }
  const res = await jsynqGet<{ boardId?: unknown; projectId?: unknown }>("/crm/boards/default")
  if (!res.success) return res.status === 404 ? { ...res, reference: res.reference ?? "FUNNEL_NO_BOARD" } : res
  const boardId = typeof res.data?.boardId === "string" ? res.data.boardId : ""
  const projectId = typeof res.data?.projectId === "string" ? res.data.projectId : ""
  if (!ID_RE.test(boardId) || !ID_RE.test(projectId))
    return { success: false, status: 404, reference: "FUNNEL_NO_BOARD" }
  if (key) {
    if (boardCache.size >= BOARD_CACHE_MAX) boardCache.delete(boardCache.keys().next().value as string)
    boardCache.set(key, { boardId, projectId, expires: Date.now() + BOARD_TTL_MS })
  }
  return { success: true, data: { boardId, projectId } }
}

/** A board that answers 404 was removed or is no longer reachable: forget it so the next call resolves the default again. */
export async function onBoardResult<T>(res: AttendeActionResult<T>): Promise<AttendeActionResult<T>> {
  if (!res.success && res.status === 404) {
    const key = await boardCacheKey()
    if (key) boardCache.delete(key)
  }
  return res
}

/** Server only. Path of the default board's table endpoints (`/crm/boards/:id/table`), or the error that explains why there is none. */
export async function funnelTablePath(): Promise<AttendeActionResult<string>> {
  const board = await defaultBoard()
  return board.success ? { success: true, data: `/crm/boards/${board.data.boardId}/table` } : board
}
