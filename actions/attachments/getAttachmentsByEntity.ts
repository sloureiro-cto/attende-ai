"use server"

import { ActionOutput } from "app/_types/Action"
import type {
  AttachmentEntityType,
  AttachmentUsage,
  IAttachment,
  IDocumentAttachment,
  IFileAttachment,
} from "app/_types/Attachment"
import { FetchClient, HttpError } from "lib/api"
import { isDocumentAttachment, isFileAttachment } from "lib/attachments/typeGuards"

type GetAttachmentsByEntityInput = {
  entityType: AttachmentEntityType
  entityId: string
  usage?: AttachmentUsage
}

type GetAttachmentsByEntityResponse = {
  attachments: IAttachment[]
}

export type SplitAttachments = {
  fileAttachments: IFileAttachment[]
  documentAttachments: IDocumentAttachment[]
}

export async function getAttachmentsByEntityAction({
  entityType,
  entityId,
  usage,
}: GetAttachmentsByEntityInput): Promise<ActionOutput<SplitAttachments>> {
  try {
    const data = await FetchClient.get<GetAttachmentsByEntityResponse>(`${process.env.BACKEND_URL}/attachments`, {
      query: { entityType, entityId, ...(usage && { usage }) },
    })

    const all = data.attachments ?? []

    return {
      success: true,
      data: {
        fileAttachments: all.filter(isFileAttachment),
        documentAttachments: all.filter(isDocumentAttachment),
      },
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return { success: false, error: error.message }
    }

    return {
      success: false,
      error: "error fetching attachments",
    }
  }
}
