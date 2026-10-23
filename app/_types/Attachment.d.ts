export type AttachmentEntityType = "card" | "comment" | "epic" | "project" | "user" | "document" | "meeting"

export type AttachmentUsage =
  | "card_attachment"
  | "card_cover"
  | "epic_attachment"
  | "meeting_background"
  | "meeting_chat_attachment"
  | "meeting_chat_transcript"
  | "project_icon"

export interface IAttachmentBase {
  _id: string
  entityType: AttachmentEntityType
  entityId: string
  usage?: AttachmentUsage
  type?: "file" | "document"
  filename: string
  entityUrl?: string
  metaData?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/** File attachment (type: file) -- has url, contentType, size */
export interface IFileAttachment extends IAttachmentBase {
  documentId: string
  url: string
  contentType: string
  size: number
}

/** Document attachment (type: document) -- has documentId */
export interface IDocumentAttachment extends IAttachmentBase {
  documentId: string
  name: string
  owner: IUser
  accessScope: "public" | "private"
  accessEntries: IAccessEntry[]
}

/** Union of both attachment types */
export type IAttachment = IFileAttachment | IDocumentAttachment
