"use server"

import { createAttachmentAction } from "actions/attachments/createAttachment"
import { deleteAttachmentAction } from "actions/attachments/deleteAttachment"
import { getAttachmentsByEntityAction } from "actions/attachments/getAttachmentsByEntity"
import { commentOnCardAction } from "actions/cards/commentOnCard"
import { createCardAction } from "actions/cards/createCard"
import { deleteCardAction } from "actions/cards/deleteCard"
import { deleteCardCommentAction } from "actions/cards/deleteCardComment"
import { getCardAction } from "actions/cards/getCard"
import { getCardCommentsAction } from "actions/cards/getCardComments"
import { getSubtasksAction } from "actions/cards/getSubtasks"
import { updateCardAction } from "actions/cards/updateCard"
import { getContactAction, updateContactAction } from "actions/contacts/contacts"
import { getLabelsAction } from "actions/labels/getLabels"
import { getLeadSourcesAction } from "actions/leadSources/getLeadSources"
import { getProjectAction } from "actions/projects/getProject"
import { getUsersFromWorkspace } from "actions/users/getUsersFromWorkspace"
import type { ICard } from "app/_types/Card"
import { auth } from "auth"
import { FetchClient, HttpError } from "lib/api"
import { type DealAttachment, toDealAttachment, toDealAttachments } from "lib/attende/funnel/attachments"
import {
  assigneeIds,
  type ChecklistItem,
  COMMENTS_PAGE_SIZE,
  commentToHtml,
  type ContactDraft,
  type DealComment,
  type DealPatch,
  type DealRef,
  isDealRef,
  isId,
  LIMITS,
  toChecklistItem,
  toChecklistItems,
  toDealComment,
  validateContactDraft,
  withOwner,
} from "lib/attende/funnel/deal"
import { DEFAULT_URL_STATE, filtersToApiQuery, type FunnelFilters, MAX_SEARCH_CHARS, PAGE_SIZES, parseFunnelParams, stateToSearchParams } from "lib/attende/funnel/model"
import { cleanStageName, type ColumnStatus, columnStatusOf, isStageKind, kindOfColumnStatus, sortStages, type StageSetting } from "lib/attende/funnel/stages"
import type { ContactsPage, FunnelPage, FunnelStage, StageKind, StagesData } from "lib/attende/funnel/types"
import type { AttendeActionResult } from "lib/attende/result"
import { funnelTablePath, onBoardResult } from "lib/attende/funnel/board"
import { jsynqGet, jsynqPatch } from "lib/attende/serverApi"

const ID_RE = /^[a-f0-9]{24}$/i
/** Cursors are opaque base64url tokens minted by the backend; anything else is refused before a request. */
const CURSOR_RE = /^[A-Za-z0-9_\-+/=]{1,2048}$/

export type FunnelOption = { id: string; name: string; color?: string | null }
export type FunnelFilterOptions = { owners: FunnelOption[]; labels: FunnelOption[]; sources: FunnelOption[]; failed: boolean }

type PageArgs = { cursor?: string | null; limit?: number; maskPhone?: boolean }

const invalid = (reference: string) => ({ success: false as const, status: 400, reference })
const okLimit = (limit: number | undefined) => (limit && (PAGE_SIZES as readonly number[]).includes(limit) ? limit : DEFAULT_URL_STATE.pageSize)
const okCursor = (cursor: string | null | undefined) => cursor == null || CURSOR_RE.test(cursor)

/** Never trust the client: the filters go through the same parser as the URL (ids, enums and dates validated). */
const sanitize = (filters: FunnelFilters): FunnelFilters => parseFunnelParams(stateToSearchParams({ ...DEFAULT_URL_STATE, filters })).filters

/** One page of the deals table. Pass `nextCursor` back unchanged; a `partial` page can be short (see the contract). */
export async function loadFunnelPageAction(filters: FunnelFilters, args: PageArgs = {}): Promise<AttendeActionResult<FunnelPage>> {
  if (!okCursor(args.cursor)) return invalid("FUNNEL_INVALID_CURSOR")
  const path = await funnelTablePath()
  if (!path.success) return path
  return onBoardResult(
    await jsynqGet<FunnelPage>(
      path.data,
      filtersToApiQuery(sanitize(filters), {
        limit: okLimit(args.limit),
        cursor: args.cursor,
        maskPhone: args.maskPhone,
      })
    )
  )
}

/** Stages of the funnel board in board order, with (cached, up to 20 s stale) counts for the chips. */
export async function loadFunnelStagesAction(): Promise<AttendeActionResult<StagesData>> {
  const path = await funnelTablePath()
  if (!path.success) return path
  return onBoardResult(await jsynqGet<StagesData>(`${path.data}/stages`))
}

/** Contact directory, ordered by name. */
export async function loadFunnelContactsAction(q: string, args: PageArgs = {}): Promise<AttendeActionResult<ContactsPage>> {
  if (!okCursor(args.cursor)) return invalid("FUNNEL_INVALID_CURSOR")
  const path = await funnelTablePath()
  if (!path.success) return path
  const search = q.trim().slice(0, MAX_SEARCH_CHARS)
  return onBoardResult(
    await jsynqGet<ContactsPage>(`${path.data}/contacts`, {
      q: search.length >= 2 ? search : undefined,
      limit: okLimit(args.limit),
      cursor: args.cursor ?? undefined,
      maskPhone: args.maskPhone ? "true" : undefined,
    })
  )
}

/**
 * Moves a deal to another stage of its board (`PATCH /crm/cards/:id/column`, the same routine as a drag on the kanban:
 * automations fire). `stage` is null when the new column has no stage info.
 */
export async function moveFunnelDealAction(
  cardId: string,
  columnId: string
): Promise<AttendeActionResult<{ cardId: string; stage: FunnelStage | null }>> {
  if (!ID_RE.test(cardId) || !ID_RE.test(columnId)) return invalid("FUNNEL_INVALID_IDS")
  return jsynqPatch<{ cardId: string; stage: FunnelStage | null }>(`/crm/cards/${cardId}/column`, { columnId })
}

/**
 * Names for the owner / label / source pickers, from the platform's existing endpoints. A failure only empties that
 * list (`failed: true`): the table keeps working.
 */
export async function loadFunnelFilterOptionsAction(projectId: string | null, boardId: string | null): Promise<FunnelFilterOptions> {
  const session = await auth()
  const workspaceId = session?.user.workspaceId ?? ""
  const project = projectId && ID_RE.test(projectId) ? projectId : null
  const board = boardId && ID_RE.test(boardId) ? boardId : undefined
  const [users, labels, sources] = await Promise.all([
    workspaceId ? getUsersFromWorkspace(workspaceId) : Promise.resolve(null),
    project ? getLabelsAction(project) : Promise.resolve(null),
    project ? getLeadSourcesAction({ projectId: project, boardId: board }) : Promise.resolve(null),
  ])
  const failed = !users?.success || !labels?.success || !sources?.success
  return {
    failed,
    owners: users?.success ? users.data.map((u) => ({ id: u.id, name: u.name || u.email })) : [],
    labels: labels?.success
      ? labels.data
          // A label scoped to other boards cannot match a deal of this one.
          .filter((l) => !board || !l.boardIds?.length || l.boardIds.includes(board))
          .filter((l) => !!l._id)
          .map((l) => ({ id: String(l._id), name: l.text, color: l.color }))
      : [],
    sources: sources?.success ? sources.data.map((s) => ({ id: s._id, name: s.text, color: s.color })) : [],
  }
}

// --- deal details: contact, deal fields, checklist, comments ---------------------------------------
// Everything below reuses the platform's existing endpoints through their existing server actions (contacts,
// cards, card comments). The backend scopes each call to the caller's workspace and board access.

type Fail = { success: false; status: number; reference?: string; message?: string }
const failed = (out: { error?: string; status?: number }, reference: string): Fail => ({ success: false, status: out.status ?? 500, reference, message: out.error })

async function sessionUser(): Promise<{ id: string; name: string; workspaceId: string } | null> {
  const session = await auth()
  if (!session?.user?.id || !session.user.workspaceId) return null
  return { id: session.user.id, name: session.user.name ?? "", workspaceId: session.user.workspaceId }
}

/** Name, phone and e-mail of a contact as stored (never masked), to fill the edit form. */
export async function loadFunnelContactAction(contactId: string): Promise<AttendeActionResult<ContactDraft>> {
  if (!isId(contactId)) return invalid("FUNNEL_INVALID_IDS")
  const user = await sessionUser()
  if (!user) return { success: false, status: 401, reference: "AUTH_REQUIRED" }
  const res = await getContactAction({ workspaceId: user.workspaceId, contactId })
  if (!res.success) return failed(res, "FUNNEL_CONTACT_LOAD_FAILED")
  return { success: true, data: { name: res.data.fullName ?? "", phone: res.data.phone ?? "", email: res.data.email ?? "" } }
}

/** Saves name / phone / e-mail (`PATCH /workspaces/:id/contacts/:contactId`, the workspace comes from the session). */
export async function updateFunnelContactAction(contactId: string, draft: ContactDraft): Promise<AttendeActionResult<ContactDraft>> {
  if (!isId(contactId)) return invalid("FUNNEL_INVALID_IDS")
  const checked = validateContactDraft({ name: String(draft?.name ?? ""), phone: String(draft?.phone ?? ""), email: String(draft?.email ?? "") })
  if (!checked.ok) return invalid(`FUNNEL_INVALID_${checked.field.toUpperCase()}`)
  const user = await sessionUser()
  if (!user) return { success: false, status: 401, reference: "AUTH_REQUIRED" }
  const res = await updateContactAction({ workspaceId: user.workspaceId, contactId, body: { fullName: checked.value.name, phone: checked.value.phone, email: checked.value.email } })
  if (!res.success) return failed(res, "FUNNEL_CONTACT_SAVE_FAILED")
  return { success: true, data: { name: res.data.fullName ?? checked.value.name, phone: res.data.phone ?? checked.value.phone, email: res.data.email ?? checked.value.email } }
}

/**
 * Value (the CRM's "estimated revenue" field), owner (first assignee) and labels of a deal, through the card update
 * the CRM uses. A deal priced by its products keeps the products' total: its value is refused here (409).
 */
export async function updateFunnelDealAction(ref: DealRef, patch: DealPatch): Promise<AttendeActionResult<{ cardId: string }>> {
  if (!isDealRef(ref)) return invalid("FUNNEL_INVALID_IDS")
  const cardData: Partial<ICard> = { _id: ref.cardId }
  const value = patch.value
  if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > LIMITS.maxValue)) return invalid("FUNNEL_INVALID_VALUE")
  if (patch.ownerId !== undefined && patch.ownerId !== null && !isId(patch.ownerId)) return invalid("FUNNEL_INVALID_IDS")
  if (patch.labelIds !== undefined && (!Array.isArray(patch.labelIds) || patch.labelIds.length > LIMITS.labels || !patch.labelIds.every(isId))) return invalid("FUNNEL_INVALID_IDS")

  if (value !== undefined || patch.ownerId !== undefined) {
    const current = await getCardAction({ projectId: ref.projectId, cardId: ref.cardId })
    if (!current.success) return failed(current, "FUNNEL_DEAL_LOAD_FAILED")
    if (value !== undefined) {
      if ((current.data.cardProducts?.length ?? 0) > 0) return { success: false, status: 409, reference: "FUNNEL_VALUE_FROM_PRODUCTS" }
      cardData.customFields = [{ fieldId: "estimateRevenue", fieldName: "Estimated revenue", fieldType: "currency", value: Math.round(value * 100) / 100 }]
    }
    if (patch.ownerId !== undefined) cardData.assignedUsers = withOwner(assigneeIds(current.data.assignedUsers), patch.ownerId)
  }
  if (patch.labelIds !== undefined) cardData.labels = [...new Set(patch.labelIds)] as unknown as ICard["labels"]
  if (Object.keys(cardData).length === 1) return invalid("FUNNEL_NOTHING_TO_SAVE")

  const res = await updateCardAction({ projectId: ref.projectId, cardData })
  if (!res.success) return failed(res, "FUNNEL_DEAL_SAVE_FAILED")
  return { success: true, data: { cardId: ref.cardId } }
}

/** The deal's checklist: its child cards (`GET /projects/:id/cards/:cardId/subtasks`), direct children only. */
export async function loadFunnelChecklistAction(ref: DealRef): Promise<AttendeActionResult<ChecklistItem[]>> {
  if (!isDealRef(ref)) return invalid("FUNNEL_INVALID_IDS")
  const res = await getSubtasksAction({ projectId: ref.projectId, cardId: ref.cardId })
  if (!res.success) return failed(res, "FUNNEL_CHECKLIST_LOAD_FAILED")
  return { success: true, data: toChecklistItems(res.data, ref.cardId) }
}

const cleanTitle = (title: unknown): string | null => {
  const text = typeof title === "string" ? title.replace(/\s+/g, " ").trim() : ""
  return text && text.length <= LIMITS.checklistTitle ? text : null
}

/** Adds an item (a child card of the deal, like the CRM checklist). `order` puts it after the existing ones. */
export async function addFunnelChecklistItemAction(ref: DealRef, title: string, order: number): Promise<AttendeActionResult<ChecklistItem>> {
  if (!isDealRef(ref)) return invalid("FUNNEL_INVALID_IDS")
  const text = cleanTitle(title)
  if (!text) return invalid("FUNNEL_INVALID_TITLE")
  const user = await sessionUser()
  const res = await createCardAction({
    card: {
      title: text,
      type: "task",
      project: ref.projectId,
      board: ref.boardId,
      parent: ref.cardId,
      ...(user ? { reporter: user.id } : {}),
      subtaskHierarchyOrder: Number.isFinite(order) && order >= 0 ? Math.floor(order) : 0,
    },
  })
  if (!res.success) return failed(res, "FUNNEL_CHECKLIST_SAVE_FAILED")
  return { success: true, data: { ...toChecklistItem(res.data), title: res.data.title || text } }
}

/** Renames and/or checks an item. */
export async function updateFunnelChecklistItemAction(ref: DealRef, itemId: string, patch: { title?: string; done?: boolean }): Promise<AttendeActionResult<{ id: string }>> {
  if (!isDealRef(ref) || !isId(itemId) || itemId === ref.cardId) return invalid("FUNNEL_INVALID_IDS")
  const cardData: Partial<ICard> = { _id: itemId }
  if (patch.title !== undefined) {
    const text = cleanTitle(patch.title)
    if (!text) return invalid("FUNNEL_INVALID_TITLE")
    cardData.title = text
  }
  if (patch.done !== undefined) cardData.completed = patch.done === true
  if (Object.keys(cardData).length === 1) return invalid("FUNNEL_NOTHING_TO_SAVE")
  const res = await updateCardAction({ projectId: ref.projectId, cardData })
  if (!res.success) return failed(res, "FUNNEL_CHECKLIST_SAVE_FAILED")
  return { success: true, data: { id: itemId } }
}

/** Removes an item (soft delete, same as the CRM). */
export async function deleteFunnelChecklistItemAction(ref: DealRef, itemId: string): Promise<AttendeActionResult<{ id: string }>> {
  if (!isDealRef(ref) || !isId(itemId) || itemId === ref.cardId) return invalid("FUNNEL_INVALID_IDS")
  const res = await deleteCardAction({ projectId: ref.projectId, cardId: itemId })
  if (!res.success) return failed(res, "FUNNEL_CHECKLIST_DELETE_FAILED")
  return { success: true, data: { id: itemId } }
}

/** One page of the deal's comments, newest first (`COMMENTS_PAGE_SIZE` per page). `mine` marks the caller's own. */
export async function loadFunnelCommentsAction(ref: DealRef, page = 1): Promise<AttendeActionResult<{ items: DealComment[]; hasMore: boolean }>> {
  if (!isDealRef(ref)) return invalid("FUNNEL_INVALID_IDS")
  const safePage = Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1
  const [user, res] = await Promise.all([sessionUser(), getCardCommentsAction({ ...ref, page: safePage })])
  if (!res.success) return failed(res, "FUNNEL_COMMENTS_LOAD_FAILED")
  const raw = Array.isArray(res.data) ? res.data : []
  return { success: true, data: { items: raw.map((c) => toDealComment(c as never, user?.id ?? null)), hasMore: raw.length >= COMMENTS_PAGE_SIZE } }
}

/** Adds a comment (plain text, stored as escaped rich text like the CRM's). */
export async function addFunnelCommentAction(ref: DealRef, text: string): Promise<AttendeActionResult<DealComment>> {
  if (!isDealRef(ref)) return invalid("FUNNEL_INVALID_IDS")
  const body = typeof text === "string" ? text.trim() : ""
  if (!body || body.length > LIMITS.comment) return invalid("FUNNEL_INVALID_COMMENT")
  const user = await sessionUser()
  const res = await commentOnCardAction({ ...ref, comment: commentToHtml(body) })
  if (!res.success) return failed(res, "FUNNEL_COMMENT_SAVE_FAILED")
  // The created comment comes back with the author id only: it is the caller's.
  const comment = toDealComment(res.data as never, user?.id ?? null, user?.name ?? "")
  return { success: true, data: { ...comment, mine: true, authorName: comment.authorName || user?.name || "", createdAt: comment.createdAt ?? new Date().toISOString() } }
}

/** Deletes a comment. The drawer only offers it on the caller's own comments. */
export async function deleteFunnelCommentAction(ref: DealRef, commentId: string): Promise<AttendeActionResult<{ id: string }>> {
  if (!isDealRef(ref) || !isId(commentId)) return invalid("FUNNEL_INVALID_IDS")
  const res = await deleteCardCommentAction({ ...ref, commentId })
  if (!res.success) return failed(res, "FUNNEL_COMMENT_DELETE_FAILED")
  return { success: true, data: { id: commentId } }
}

// --- deal attachments ------------------------------------------------------------------------------
// The CRM card's attachment links (`GET/POST/DELETE /attachments`), through the platform's attachment actions. Files
// the lead sent or received on WhatsApp are synced into the same list by the backend.

/** The deal's attachments (files and library documents), newest first. */
export async function loadFunnelAttachmentsAction(cardId: string): Promise<AttendeActionResult<DealAttachment[]>> {
  if (!isId(cardId)) return invalid("FUNNEL_INVALID_IDS")
  const res = await getAttachmentsByEntityAction({ entityType: "card", entityId: cardId, usage: "card_attachment" })
  if (!res.success) return failed(res, "FUNNEL_ATTACHMENTS_LOAD_FAILED")
  return { success: true, data: toDealAttachments(res.data) }
}

/**
 * Where a deal's uploads go: the library folder of the funnel's project (same as the CRM's attachment upload).
 * `null` when the project has none (the upload then goes to the library root, like the CRM's create flow).
 */
export async function loadFunnelUploadFolderAction(projectId: string): Promise<AttendeActionResult<{ folderId: string | null }>> {
  if (!isId(projectId)) return invalid("FUNNEL_INVALID_IDS")
  const res = await getProjectAction({ idOrSlug: projectId })
  if (!res.success) return failed(res, "FUNNEL_PROJECT_LOAD_FAILED")
  const folderId = typeof res.data.folderId === "string" && isId(res.data.folderId) ? res.data.folderId : null
  return { success: true, data: { folderId } }
}

/** Links an uploaded library document to the deal (what the CRM's `/api/cards/attachments/link` route does). */
export async function linkFunnelAttachmentAction(cardId: string, documentId: string): Promise<AttendeActionResult<DealAttachment | null>> {
  if (!isId(cardId) || !isId(documentId)) return invalid("FUNNEL_INVALID_IDS")
  const res = await createAttachmentAction({ entityType: "card", entityId: cardId, usage: "card_attachment", documentId })
  if (!res.success) return failed(res, "FUNNEL_ATTACHMENT_LINK_FAILED")
  return { success: true, data: toDealAttachment(res.data as never) }
}

/** Removes an attachment from the deal. The file stays in the library (the platform only unlinks it). */
export async function deleteFunnelAttachmentAction(cardId: string, attachmentId: string): Promise<AttendeActionResult<{ id: string }>> {
  if (!isId(cardId) || !isId(attachmentId)) return invalid("FUNNEL_INVALID_IDS")
  const res = await deleteAttachmentAction({ attachmentId })
  if (!res.success) return failed(res, "FUNNEL_ATTACHMENT_DELETE_FAILED")
  return { success: true, data: { id: attachmentId } }
}

// --- stages (the funnel board's columns) -----------------------------------------------------------
// Same endpoints as the CRM's board settings (`actions/columns/*`): POST/DELETE
// `/projects/:p/boards/:b/columns[/:id]` and PUT `/projects/:p/columns/:id`. They are called here with the platform's
// HTTP client directly so a refusal keeps its HTTP status (403 = the role lacks PROJECT_CREATE_COLUMN /
// PROJECT_UPDATE_COLUMN / PROJECT_DELETE_COLUMN). The board is always the funnel's own, resolved on the server.

type FunnelBoardRef = { projectId: string; boardId: string; stageIds: Set<string> }

async function funnelBoardRef(): Promise<FunnelBoardRef | Fail> {
  const res = await loadFunnelStagesAction()
  if (!res.success) return res
  const { board } = res.data
  if (!board?.projectId || !isId(board.projectId) || !isId(board.id)) return { success: false, status: 404, reference: "FUNNEL_NO_BOARD" }
  return { projectId: board.projectId, boardId: board.id, stageIds: new Set(res.data.stages.map((s) => s.id)) }
}

const httpFail = (error: unknown, reference: string): Fail =>
  error instanceof HttpError ? { success: false, status: error.status, reference, message: error.message } : { success: false, status: 500, reference }

type RawColumn = { _id?: unknown; title?: unknown; columnStatus?: unknown; boardIndex?: unknown }
const toStageSetting = (c: RawColumn): StageSetting => ({
  id: String(c._id ?? ""),
  name: typeof c.title === "string" ? c.title : "",
  kind: kindOfColumnStatus(c.columnStatus),
  boardIndex: c.boardIndex == null ? "" : String(c.boardIndex),
})

/** The funnel's stages with their raw board positions, in board order. */
export async function loadFunnelStageSettingsAction(): Promise<AttendeActionResult<{ projectId: string; boardId: string; stages: StageSetting[] }>> {
  const ref = await funnelBoardRef()
  if ("success" in ref) return ref
  try {
    const data = await FetchClient.get<{ columns?: RawColumn[] }>(`${process.env.BACKEND_URL}/projects/${ref.projectId}/boards/${ref.boardId}/columns`, { cache: "no-store" })
    const stages = sortStages((data.columns ?? []).map(toStageSetting).filter((s) => isId(s.id)))
    return { success: true, data: { projectId: ref.projectId, boardId: ref.boardId, stages } }
  } catch (error) {
    return httpFail(error, "FUNNEL_STAGES_LOAD_FAILED")
  }
}

/** Adds a stage at the end of the funnel. */
export async function createFunnelStageAction(input: { name: string; kind: StageKind; boardIndex: string }): Promise<AttendeActionResult<StageSetting>> {
  const name = cleanStageName(input?.name)
  if (!name) return invalid("FUNNEL_INVALID_STAGE_NAME")
  if (!isStageKind(input?.kind)) return invalid("FUNNEL_INVALID_STAGE_KIND")
  const index = String(input?.boardIndex ?? "")
  if (!/^-?\d+(\.\d+)?$/.test(index)) return invalid("FUNNEL_INVALID_STAGE_INDEX")
  const ref = await funnelBoardRef()
  if ("success" in ref) return ref
  try {
    const data = await FetchClient.post<{ column?: RawColumn }>(`${process.env.BACKEND_URL}/projects/${ref.projectId}/boards/${ref.boardId}/columns`, {
      title: name,
      index,
      status: columnStatusOf(input.kind),
    })
    const created = data.column ? toStageSetting(data.column) : null
    if (!created || !isId(created.id)) return { success: false, status: 502, reference: "FUNNEL_STAGE_SAVE_FAILED" }
    return { success: true, data: { ...created, name: created.name || name, boardIndex: created.boardIndex || index } }
  } catch (error) {
    return httpFail(error, "FUNNEL_STAGE_SAVE_FAILED")
  }
}

/** Renames a stage, changes its kind and/or its position (`boardIndex`). */
export async function updateFunnelStageAction(stageId: string, patch: { name?: string; kind?: StageKind; boardIndex?: string }): Promise<AttendeActionResult<{ id: string }>> {
  if (!isId(stageId)) return invalid("FUNNEL_INVALID_IDS")
  const body: { title?: string; columnStatus?: ColumnStatus; boardIndex?: string } = {}
  if (patch?.name !== undefined) {
    const name = cleanStageName(patch.name)
    if (!name) return invalid("FUNNEL_INVALID_STAGE_NAME")
    body.title = name
  }
  if (patch?.kind !== undefined) {
    if (!isStageKind(patch.kind)) return invalid("FUNNEL_INVALID_STAGE_KIND")
    body.columnStatus = columnStatusOf(patch.kind)
  }
  if (patch?.boardIndex !== undefined) {
    if (!/^-?\d+(\.\d+)?$/.test(String(patch.boardIndex))) return invalid("FUNNEL_INVALID_STAGE_INDEX")
    body.boardIndex = String(patch.boardIndex)
  }
  if (Object.keys(body).length === 0) return invalid("FUNNEL_NOTHING_TO_SAVE")
  const ref = await funnelBoardRef()
  if ("success" in ref) return ref
  if (!ref.stageIds.has(stageId)) return { success: false, status: 404, reference: "FUNNEL_STAGE_NOT_FOUND" }
  try {
    await FetchClient.put(`${process.env.BACKEND_URL}/projects/${ref.projectId}/columns/${stageId}`, body)
    return { success: true, data: { id: stageId } }
  } catch (error) {
    return httpFail(error, "FUNNEL_STAGE_SAVE_FAILED")
  }
}

/**
 * Removes a stage and moves its deals to `moveTo` (required: deals never lose their stage). The last stage cannot be
 * removed. The platform moves the cards in bulk: no automation fires for them and their deal status is not re-derived
 * from the new stage.
 */
export async function deleteFunnelStageAction(stageId: string, moveTo: string): Promise<AttendeActionResult<{ id: string; moveTo: string }>> {
  if (!isId(stageId) || !isId(moveTo) || stageId === moveTo) return invalid("FUNNEL_INVALID_IDS")
  const ref = await funnelBoardRef()
  if ("success" in ref) return ref
  if (!ref.stageIds.has(stageId) || !ref.stageIds.has(moveTo)) return { success: false, status: 404, reference: "FUNNEL_STAGE_NOT_FOUND" }
  if (ref.stageIds.size <= 1) return { success: false, status: 409, reference: "FUNNEL_LAST_STAGE" }
  try {
    await FetchClient.delete(`${process.env.BACKEND_URL}/projects/${ref.projectId}/boards/${ref.boardId}/columns/${stageId}`, { query: { moveTo } })
    return { success: true, data: { id: stageId, moveTo } }
  } catch (error) {
    return httpFail(error, "FUNNEL_STAGE_DELETE_FAILED")
  }
}
