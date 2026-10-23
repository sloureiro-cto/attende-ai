import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type { DealAttachment } from "lib/attende/funnel/attachments"
import { id } from "lib/attende/funnel/fixtures"
import { translateAttendeFunnel } from "lib/i18n/translations/attende/funnel"
import { DealAttachments } from "./DealAttachments"

const loadFunnelAttachmentsAction = jest.fn()
const loadFunnelUploadFolderAction = jest.fn()
const linkFunnelAttachmentAction = jest.fn()
const deleteFunnelAttachmentAction = jest.fn()
jest.mock("actions/attende/funnel", () => ({
  loadFunnelAttachmentsAction: (...a: unknown[]) => loadFunnelAttachmentsAction(...a),
  loadFunnelUploadFolderAction: (...a: unknown[]) => loadFunnelUploadFolderAction(...a),
  linkFunnelAttachmentAction: (...a: unknown[]) => linkFunnelAttachmentAction(...a),
  deleteFunnelAttachmentAction: (...a: unknown[]) => deleteFunnelAttachmentAction(...a),
}))
const uploadDocumentDirect = jest.fn()
jest.mock("lib/uploadDocumentDirect", () => ({ uploadDocumentDirect: (...a: unknown[]) => uploadDocumentDirect(...a) }))

const t = (key: Parameters<typeof translateAttendeFunnel>[1], r?: Record<string, string | number>) => translateAttendeFunnel("english", key, r)
const ok = <T,>(data: T) => ({ success: true as const, data })
const fail = (status = 500) => ({ success: false as const, status })

const CARD = id(1)
const PROJECT = id(8)
const att = (n: number, over: Partial<DealAttachment> = {}): DealAttachment => ({
  id: id(7000 + n),
  documentId: id(8000 + n),
  name: `proposal-${n}.pdf`,
  contentType: "application/pdf",
  size: 2 * 1024 * 1024,
  createdAt: "2026-10-20T10:00:00.000Z",
  kind: "file",
  ...over,
})

const renderIt = () => render(<DealAttachments cardId={CARD} projectId={PROJECT} t={t} language="english" />)
const items = () => screen.getAllByTestId("deal-attachment")
const pdf = (name: string, size = 1000) => {
  const file = new File(["%PDF"], name, { type: "application/pdf" })
  Object.defineProperty(file, "size", { value: size })
  return file
}
const pickFiles = (files: File[]) => fireEvent.change(screen.getByTestId("attachment-input"), { target: { files } })

beforeEach(() => {
  jest.clearAllMocks()
  loadFunnelUploadFolderAction.mockResolvedValue(ok({ folderId: id(900) }))
})

describe("DealAttachments", () => {
  it("lists the deal's attachments with type, size, date, open and download", async () => {
    loadFunnelAttachmentsAction.mockResolvedValue(ok([att(1), att(2, { kind: "document", contentType: null, size: null, name: "Meeting notes" })]))
    renderIt()
    expect(screen.getByText("Loading…")).toBeInTheDocument()
    await waitFor(() => expect(items()).toHaveLength(2))
    expect(loadFunnelAttachmentsAction).toHaveBeenCalledWith(CARD)
    const first = items()[0]!
    expect(within(first).getByText("proposal-1.pdf")).toBeInTheDocument()
    expect(within(first).getByText(/PDF · 2 MB · /)).toBeInTheDocument()
    expect(within(first).getByRole("link", { name: "Open proposal-1.pdf" })).toHaveAttribute("href", `/funnel/attachments/${id(8001)}`)
    expect(within(first).getByRole("button", { name: "Download proposal-1.pdf" })).toBeInTheDocument()
    // A library text document has no file to open or download, and an unknown size is not shown as 0.
    const second = items()[1]!
    expect(within(second).getByText(/^Library document · /)).toBeInTheDocument()
    expect(within(second).queryByRole("link")).toBeNull()
    expect(within(second).queryByRole("button", { name: /Download/ })).toBeNull()
  })

  it("shows an empty state with a hint", async () => {
    loadFunnelAttachmentsAction.mockResolvedValue(ok([]))
    renderIt()
    expect(await screen.findByText(/No attachments yet/)).toBeInTheDocument()
  })

  it("shows an error with a retry", async () => {
    loadFunnelAttachmentsAction.mockResolvedValueOnce(fail()).mockResolvedValueOnce(ok([att(1)]))
    renderIt()
    expect(await screen.findByText("We could not load the attachments.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await waitFor(() => expect(items()).toHaveLength(1))
    expect(loadFunnelAttachmentsAction).toHaveBeenCalledTimes(2)
  })

  it("uploads a file into the project's folder and links it to the deal", async () => {
    loadFunnelAttachmentsAction.mockResolvedValueOnce(ok([att(1)])).mockResolvedValueOnce(ok([att(3, { name: "contract.pdf" }), att(1)]))
    uploadDocumentDirect.mockResolvedValue({ _id: id(8003) })
    linkFunnelAttachmentAction.mockResolvedValue(ok(att(3, { name: "contract.pdf" })))
    renderIt()
    await waitFor(() => expect(items()).toHaveLength(1))
    await act(async () => pickFiles([pdf("contract.pdf")]))
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("File added."))
    expect(loadFunnelUploadFolderAction).toHaveBeenCalledWith(PROJECT)
    expect(uploadDocumentDirect).toHaveBeenCalledWith(expect.any(File), { parentId: id(900), accessScope: "workspace", status: "published" })
    expect(linkFunnelAttachmentAction).toHaveBeenCalledWith(CARD, id(8003))
    await waitFor(() => expect(items()).toHaveLength(2))
    expect(within(items()[0]!).getByText("contract.pdf")).toBeInTheDocument()
  })

  it("keeps the list when an upload fails, and refuses types and sizes the API would reject", async () => {
    loadFunnelAttachmentsAction.mockResolvedValue(ok([att(1)]))
    uploadDocumentDirect.mockRejectedValue(new Error("boom"))
    renderIt()
    await waitFor(() => expect(items()).toHaveLength(1))
    await act(async () => pickFiles([pdf("broken.pdf"), new File(["x"], "run.exe", { type: "application/octet-stream" }), pdf("huge.pdf", 51 * 1024 * 1024)]))
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("We could not upload broken.pdf.")
    expect(alert).toHaveTextContent("run.exe cannot be attached.")
    expect(alert).toHaveTextContent("huge.pdf is larger than 50 MB.")
    expect(uploadDocumentDirect).toHaveBeenCalledTimes(1)
    expect(linkFunnelAttachmentAction).not.toHaveBeenCalled()
    expect(items()).toHaveLength(1)
    expect(screen.getByRole("button", { name: "Add file" })).toBeEnabled()
  })

  it("shows the upload in progress and blocks a second one meanwhile", async () => {
    loadFunnelAttachmentsAction.mockResolvedValue(ok([]))
    let finish: (v: unknown) => void = () => undefined
    uploadDocumentDirect.mockReturnValue(new Promise((r) => (finish = r)))
    linkFunnelAttachmentAction.mockResolvedValue(ok(att(4)))
    renderIt()
    await screen.findByText(/No attachments yet/)
    await act(async () => pickFiles([pdf("a.pdf")]))
    expect(screen.getByRole("status")).toHaveTextContent("Uploading the file…")
    expect(screen.getByRole("button", { name: "Add file" })).toBeDisabled()
    await act(async () => finish({ _id: id(8004) }))
    await waitFor(() => expect(screen.getByRole("button", { name: "Add file" })).toBeEnabled())
  })

  it("asks before removing, and puts the attachment back when the removal fails", async () => {
    loadFunnelAttachmentsAction.mockResolvedValue(ok([att(1), att(2)]))
    deleteFunnelAttachmentAction.mockResolvedValueOnce(fail(403)).mockResolvedValueOnce(ok({ id: id(7001) }))
    renderIt()
    await waitFor(() => expect(items()).toHaveLength(2))
    fireEvent.click(screen.getByRole("button", { name: "Remove proposal-1.pdf" }))
    expect(deleteFunnelAttachmentAction).not.toHaveBeenCalled()
    const confirm = screen.getByRole("group", { name: "Remove this attachment from the deal?" })
    fireEvent.click(within(confirm).getByRole("button", { name: "Cancel" }))
    expect(screen.queryByRole("group", { name: "Remove this attachment from the deal?" })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Remove proposal-1.pdf" }))
    await act(async () => fireEvent.click(within(screen.getByRole("group", { name: "Remove this attachment from the deal?" })).getByRole("button", { name: "Remove" })))
    expect(deleteFunnelAttachmentAction).toHaveBeenCalledWith(CARD, id(7001))
    expect(await screen.findByRole("alert")).toHaveTextContent("You do not have permission to remove this attachment.")
    expect(items()).toHaveLength(2)

    fireEvent.click(screen.getByRole("button", { name: "Remove proposal-1.pdf" }))
    await act(async () => fireEvent.click(within(screen.getByRole("group", { name: "Remove this attachment from the deal?" })).getByRole("button", { name: "Remove" })))
    await waitFor(() => expect(items()).toHaveLength(1))
    expect(screen.getByRole("status")).toHaveTextContent("Attachment removed from the deal.")
  })
})
