"use server"

import { ActionOutput } from "app/_types/Action"
import type { AttachmentEntityType, AttachmentUsage, IAttachmentBase, IFileAttachment } from "app/_types/Attachment"
import { FetchClient, HttpError } from "lib/api"

type CreateFileAttachmentInput = {
  entityType: AttachmentEntityType
  entityId: string
  usage: AttachmentUsage
  documentId: string
  /** When set, included in POST /attachments body (e.g. meet chat uploads). */
  workspaceId?: string
  /** Meet room slug from URL / LiveKit context — backend may use with `entityId`. */
  meetingRoomName?: string
}

type CreateDocumentAttachmentInput = {
  entityType: AttachmentEntityType
  entityId: string
  usage: AttachmentUsage
  documentId: string
}

type CreateFileAttachmentResponse = {
  attachment: IFileAttachment
}

type CreateDocumentAttachmentResponse = {
  attachment: IAttachmentBase & Record<string, unknown>
}

async function postFileAttachment(
  body: Record<string, unknown>,
  errorMessage: string
): Promise<ActionOutput<IFileAttachment>> {
  try {
    const data = await FetchClient.post<CreateFileAttachmentResponse>(`${process.env.BACKEND_URL}/attachments`, body)
    return { success: true, data: data.attachment }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: errorMessage }
  }
}

async function postDocumentAttachment(
  body: Record<string, unknown>,
  errorMessage: string
): Promise<ActionOutput<IAttachmentBase & Record<string, unknown>>> {
  try {
    const data = await FetchClient.post<CreateDocumentAttachmentResponse>(
      `${process.env.BACKEND_URL}/attachments`,
      body
    )
    return { success: true, data: data.attachment }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }
    return { success: false, error: errorMessage }
  }
}

/**
 * Creates an attachment between an entity and a file (documentId references the uploaded file).
 * Backend returns full IFileAttachment shape.
 */
export async function createAttachmentAction({
  entityType,
  entityId,
  usage,
  documentId,
  workspaceId,
  meetingRoomName,
}: CreateFileAttachmentInput): Promise<ActionOutput<IFileAttachment>> {
  const body: Record<string, unknown> = { entityType, entityId, usage, document: documentId }
  if (workspaceId) {
    body.workspaceId = workspaceId
  }
  if (meetingRoomName) {
    body.meetingRoomName = meetingRoomName
  }
  return postFileAttachment(body, "error creating attachment")
}

/**
 * Creates an attachment between an entity and a document.
 */
export async function createDocumentAttachmentAction({
  entityType,
  entityId,
  usage,
  documentId,
}: CreateDocumentAttachmentInput): Promise<ActionOutput<IAttachmentBase & Record<string, unknown>>> {
  return postDocumentAttachment(
    { entityType, entityId, usage, document: documentId },
    "error creating document attachment"
  )
}
