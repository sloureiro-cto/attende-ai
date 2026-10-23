"use server"

import { ActionOutput } from "app/_types/Action"
import { FetchClient, HttpError } from "lib/api"
import { asArray } from "lib/blockNote/parseBlockNoteInitialContent"

export type CardFieldDisplayZone = "aboveDescription" | "sidebar"
export type CardFieldWidth = "full" | "half" | "third"
export type CardValueFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "datetime"
  | "time"
  | "select"
  | "multiselect"
  | "boolean"
  | "email"
  | "url"
  | "currency"
  | "file"
export type CardFieldType = CardValueFieldType | "button" | "group"
export type CardFieldKind = "field" | "button" | "group"
export type CardButtonAction = "open_link" | "execute_agent" | "execute_skill"
export type CardFieldSource = "manual" | "rdstation" | "clickup" | "kommo" | "csv_import" | "form" | "default"

export interface ICardButtonStyle {
  fontSize?: string
  color?: string
  backgroundColor?: string
  borderColor?: string
  hoverColor?: string
  borderRadius?: string
}

export interface ICardButtonConfig {
  url?: string
  agentId?: string
  prompt?: string
  skillId?: string
}

export interface ICardFieldDefinition {
  _id: string
  cardLayout: string
  fieldId: string
  fieldName: string
  fieldType: CardFieldType
  kind?: CardFieldKind
  buttonAction?: CardButtonAction
  buttonConfig?: ICardButtonConfig
  buttonStyle?: ICardButtonStyle
  /** Parent group `_id` for fields/buttons; groups themselves are never nested (null). */
  groupId?: string | null
  /** Groups only: accordion initial state on the card (default true). */
  defaultOpen?: boolean
  /** Fields only: example text shown in the empty input. */
  placeholder?: string
  /** Fields only. */
  required?: boolean
  /** Empty (both) = everyone who can see the card. A group's list also hides its children. */
  viewerUserIds?: string[]
  viewerRoleIds?: string[]
  options?: string[]
  displayZone: CardFieldDisplayZone
  /** Chosen by the user (third / half / full) and stored as-is. */
  width: CardFieldWidth
  /** true (or missing, on fields written before this flag existed) starts a new row; false packs into the previous field's row. */
  rowBreak?: boolean
  order: number
  source: CardFieldSource
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export async function getCardFieldDefinitionsAction({
  projectId,
  layoutId,
  boardId,
  cardType,
  includeHidden,
}: {
  projectId: string
  layoutId?: string
  boardId?: string
  cardType?: string
  /** Settings screen only (managers): also returns what the viewer ACL hides for the current user. */
  includeHidden?: boolean
}): Promise<ActionOutput<ICardFieldDefinition[]>> {
  try {
    const query: Record<string, string> = {}
    if (includeHidden) query.includeHidden = "true"
    if (layoutId) query.layoutId = layoutId
    if (boardId) query.boardId = boardId
    if (cardType) query.cardType = cardType
    const data = await FetchClient.get<{ fieldDefinitions: ICardFieldDefinition[] }>(
      `${process.env.BACKEND_URL}/projects/${projectId}/card-field-definitions`,
      { cache: "no-store", query: Object.keys(query).length ? query : undefined }
    )
    return { success: true, data: asArray<ICardFieldDefinition>(data?.fieldDefinitions ?? data) }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message, status: error.status }
    }
    return { success: false, error: "something went wrong fetching custom fields" }
  }
}

export type CreateCardFieldDefinitionInput = {
  projectId: string
  layoutId?: string
  boardId?: string
  cardType?: string
  fieldName: string
  fieldType: CardFieldType
  options?: string[]
  displayZone?: CardFieldDisplayZone
  width?: CardFieldWidth
  kind?: CardFieldKind
  /** Target group (fields/buttons). The server copies the group's displayZone. */
  groupId?: string | null
  defaultOpen?: boolean
  placeholder?: string
  required?: boolean
  buttonAction?: CardButtonAction
  buttonConfig?: ICardButtonConfig
  buttonStyle?: ICardButtonStyle
  viewerUserIds?: string[]
  viewerRoleIds?: string[]
}

export async function createCardFieldDefinitionAction({
  projectId,
  ...body
}: CreateCardFieldDefinitionInput): Promise<ActionOutput<ICardFieldDefinition>> {
  try {
    const data = await FetchClient.post<{ fieldDefinition: ICardFieldDefinition }>(
      `${process.env.BACKEND_URL}/projects/${projectId}/card-field-definitions`,
      body
    )
    return { success: true, data: data.fieldDefinition }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message, status: error.status }
    }
    return { success: false, error: "something went wrong creating the custom field" }
  }
}

export type UpdateCardFieldDefinitionInput = {
  projectId: string
  layoutId?: string
  boardId?: string
  cardType?: string
  fieldDefinitionId: string
  fieldName?: string
  options?: string[]
  displayZone?: CardFieldDisplayZone
  width?: CardFieldWidth
  placeholder?: string
  required?: boolean
  defaultOpen?: boolean
  buttonAction?: CardButtonAction
  buttonConfig?: ICardButtonConfig
  buttonStyle?: ICardButtonStyle
  viewerUserIds?: string[]
  viewerRoleIds?: string[]
}

export async function updateCardFieldDefinitionAction({
  projectId,
  fieldDefinitionId,
  ...body
}: UpdateCardFieldDefinitionInput): Promise<ActionOutput<ICardFieldDefinition>> {
  try {
    const data = await FetchClient.put<{ fieldDefinition: ICardFieldDefinition }>(
      `${process.env.BACKEND_URL}/projects/${projectId}/card-field-definitions/${fieldDefinitionId}`,
      body
    )
    return { success: true, data: data.fieldDefinition }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message, status: error.status }
    }
    return { success: false, error: "something went wrong updating the custom field" }
  }
}

export async function deleteCardFieldDefinitionAction({
  projectId,
  layoutId,
  boardId,
  cardType,
  fieldDefinitionId,
  children,
}: {
  projectId: string
  layoutId?: string
  boardId?: string
  cardType?: string
  fieldDefinitionId: string
  /** Groups only: `ungroup` (default) keeps the children, `delete` deletes them (and their card values) too. */
  children?: "ungroup" | "delete"
}): Promise<ActionOutput<null>> {
  try {
    const query: Record<string, string> = {}
    if (children) query.children = children
    if (layoutId) query.layoutId = layoutId
    if (boardId) query.boardId = boardId
    if (cardType) query.cardType = cardType
    await FetchClient.delete(
      `${process.env.BACKEND_URL}/projects/${projectId}/card-field-definitions/${fieldDefinitionId}`,
      { query: Object.keys(query).length ? query : undefined }
    )
    return { success: true, data: null }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message, status: error.status }
    }
    return { success: false, error: "something went wrong deleting the custom field" }
  }
}

export async function resetCardFieldDefinitionsToDefaultAction({
  projectId,
  layoutId,
  boardId,
  cardType,
}: {
  projectId: string
  layoutId?: string
  boardId?: string
  cardType?: string
}): Promise<ActionOutput<ICardFieldDefinition[]>> {
  try {
    const data = await FetchClient.put<{ fieldDefinitions: ICardFieldDefinition[] }>(
      `${process.env.BACKEND_URL}/projects/${projectId}/card-field-definitions/reset-default`,
      { layoutId, boardId, cardType }
    )
    return { success: true, data: asArray<ICardFieldDefinition>(data?.fieldDefinitions ?? data) }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message, status: error.status }
    }
    return { success: false, error: "something went wrong restoring the default layout" }
  }
}

export type ReorderCardFieldDefinitionsItem = {
  id: string
  displayZone: CardFieldDisplayZone
  /** Parent group id (null/omitted = zone root). Groups are never nested. */
  groupId?: string | null
  /** Explicit width; when omitted the server keeps the stored one. */
  width?: CardFieldWidth
  /** Legacy row packing: keep sending true. */
  rowBreak?: boolean
}

export async function reorderCardFieldDefinitionsAction({
  projectId,
  layoutId,
  boardId,
  cardType,
  items,
}: {
  projectId: string
  layoutId?: string
  boardId?: string
  cardType?: string
  items: ReorderCardFieldDefinitionsItem[]
}): Promise<ActionOutput<ICardFieldDefinition[]>> {
  try {
    const data = await FetchClient.put<{ fieldDefinitions: ICardFieldDefinition[] }>(
      `${process.env.BACKEND_URL}/projects/${projectId}/card-field-definitions/reorder`,
      { items, layoutId, boardId, cardType }
    )
    return { success: true, data: asArray<ICardFieldDefinition>(data?.fieldDefinitions ?? data) }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message, status: error.status }
    }
    return { success: false, error: "something went wrong reordering custom fields" }
  }
}
