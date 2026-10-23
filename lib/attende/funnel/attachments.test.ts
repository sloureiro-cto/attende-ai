import { attachmentFileHref, attachmentRejection, attachmentTypeKey, isInlineSafe, toDealAttachments } from "./attachments"
import { id } from "./fixtures"

describe("deal attachments", () => {
  it("maps file and document links, newest first, and reads a 0 size as unknown", () => {
    const list = toDealAttachments({
      fileAttachments: [
        { _id: id(1), type: "file", documentId: id(11), filename: "a.pdf", contentType: "application/pdf", size: 0, createdAt: "2026-10-01T00:00:00.000Z" },
        { _id: "bad", type: "file", filename: "x" },
      ],
      documentAttachments: [{ _id: id(2), type: "document", documentId: id(12), name: "Notes", createdAt: "2026-10-02T00:00:00.000Z" }],
    })
    expect(list.map((a) => a.id)).toEqual([id(2), id(1)])
    expect(list[1]).toMatchObject({ name: "a.pdf", size: null, kind: "file", documentId: id(11) })
    expect(list[0]).toMatchObject({ name: "Notes", kind: "document" })
  })

  it("refuses what the Attende upload guard would refuse", () => {
    expect(attachmentRejection({ name: "a.pdf", type: "application/pdf", size: 10 })).toBeNull()
    expect(attachmentRejection({ name: "a.png", type: "image/png", size: 10 })).toBe("type")
    expect(attachmentRejection({ name: "a.exe", type: "application/pdf", size: 10 })).toBe("type")
    expect(attachmentRejection({ name: "a.pdf", type: "application/pdf", size: 0 })).toBe("empty")
    expect(attachmentRejection({ name: "a.pdf", type: "application/pdf", size: 51 * 1024 * 1024 })).toBe("size")
  })

  it("names the kind of file", () => {
    expect(attachmentTypeKey({ kind: "file", contentType: "application/pdf", name: "x" })).toBe("attachmentTypePdf")
    expect(attachmentTypeKey({ kind: "file", contentType: null, name: "x.xlsx" })).toBe("attachmentTypeSheet")
    expect(attachmentTypeKey({ kind: "file", contentType: "image/jpeg", name: "x" })).toBe("attachmentTypeImage")
    expect(attachmentTypeKey({ kind: "document", contentType: null, name: "x" })).toBe("attachmentTypeDocument")
  })

  it("links through the funnel route and only opens safe types inline", () => {
    expect(attachmentFileHref(id(3))).toBe(`/funnel/attachments/${id(3)}`)
    expect(attachmentFileHref(id(3), true)).toBe(`/funnel/attachments/${id(3)}?download=1`)
    expect(isInlineSafe("application/pdf")).toBe(true)
    expect(isInlineSafe("image/png; charset=binary")).toBe(true)
    expect(isInlineSafe("text/html")).toBe(false)
    expect(isInlineSafe("image/svg+xml")).toBe(false)
  })
})
