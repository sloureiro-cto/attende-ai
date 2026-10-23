import type { IAttachment, IDocumentAttachment, IFileAttachment } from "app/_types/Attachment"

export function isFileAttachment(a: IAttachment): a is IFileAttachment {
  return a.type === "file"
}

export function isDocumentAttachment(a: IAttachment): a is IDocumentAttachment {
  return a.type === "document"
}
