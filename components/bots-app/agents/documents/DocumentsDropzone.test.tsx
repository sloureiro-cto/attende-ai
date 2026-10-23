import { act, render, renderHook, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { AgentActionResult, KnowledgeDocument } from "lib/attende/agents/types"
import { translateAttendeAgents } from "lib/i18n/translations/attende/agents"
import { DocumentsDropzone } from "./DocumentsDropzone"
import { useUploadQueue } from "./useUploadQueue"

jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))

const t = (key: Parameters<typeof translateAttendeAgents>[1], r?: Record<string, string | number>) => translateAttendeAgents("english", key, r)
const pdf = (name = "prices.pdf") => new File(["hello"], name, { type: "application/pdf" })
const doc: KnowledgeDocument = { documentId: "d1", name: "prices.pdf", mimeType: "application/pdf", sizeBytes: 5, uploadedAt: "2026-10-22T00:00:00Z", indexStatus: "pending" }

describe("useUploadQueue", () => {
  it("waits while there is no agent, then sends files one by one with progress", async () => {
    let finish: (r: AgentActionResult<KnowledgeDocument>) => void = () => undefined
    let progress: (p: number) => void = () => undefined
    const upload = jest.fn((_id: string, _file: File, onProgress?: (p: number) => void) => {
      progress = onProgress ?? progress
      return new Promise<AgentActionResult<KnowledgeDocument>>((resolve) => (finish = resolve))
    })
    const onUploaded = jest.fn()
    const { result, rerender } = renderHook(({ agentId }: { agentId: string | null }) => useUploadQueue({ agentId, upload, onUploaded }), { initialProps: { agentId: null as string | null } })
    act(() => result.current.addFiles([pdf(), pdf("notes.exe")]))
    expect(result.current.state.items).toHaveLength(1)
    expect(result.current.state.rejected).toEqual([{ name: "notes.exe", issue: "type" }])
    expect(upload).not.toHaveBeenCalled()

    rerender({ agentId: "a1" })
    expect(upload).toHaveBeenCalledTimes(1)
    act(() => progress(60))
    expect(result.current.state.items[0]).toMatchObject({ status: "uploading", percent: 60 })
    await act(async () => finish({ success: true, data: doc }))
    expect(result.current.state.items[0]).toMatchObject({ status: "done", percent: 100 })
    expect(onUploaded).toHaveBeenCalledWith(doc)
  })

  it("marks a failed upload and lets it be retried", async () => {
    const upload = jest.fn().mockResolvedValueOnce({ success: false, status: 403, code: "ATTENDE_QUOTA_EXCEEDED", details: { resource: "docs" } }).mockResolvedValueOnce({ success: true, data: doc })
    const { result } = renderHook(() => useUploadQueue({ agentId: "a1", upload }))
    await act(async () => result.current.addFiles([pdf()]))
    expect(result.current.state.items[0]!.status).toBe("failed")
    await act(async () => result.current.retry(result.current.state.items[0]!.id))
    expect(upload).toHaveBeenCalledTimes(2)
    expect(result.current.state.items[0]!.status).toBe("done")
  })
})

describe("DocumentsDropzone", () => {
  it("lists files with progress, errors and the local rejections", async () => {
    const onAddFiles = jest.fn()
    render(
      <DocumentsDropzone
        t={t}
        queue={{
          items: [
            { id: "1", file: pdf(), name: "prices.pdf", size: 5, status: "uploading", percent: 40 },
            { id: "2", file: pdf("faq.pdf"), name: "faq.pdf", size: 5, status: "failed", percent: 0, error: { success: false, status: 403, code: "ATTENDE_QUOTA_EXCEEDED", details: { resource: "docs" } } },
          ],
          rejected: [{ name: "big.pdf", issue: "size" }],
        }}
        onAddFiles={onAddFiles}
        onRemove={jest.fn()}
        onRetry={jest.fn()}
        onClearRejected={jest.fn()}
      />
    )
    expect(screen.getByRole("progressbar", { name: "prices.pdf" })).toHaveAttribute("aria-valuenow", "40")
    expect(screen.getByText("Sending… 40%")).toBeInTheDocument()
    expect(screen.getAllByText(/Your plan reached its document limit/).length).toBeGreaterThan(0)
    expect(screen.getByRole("link", { name: "See plans" })).toHaveAttribute("href", "/billing")
    expect(screen.getByText("big.pdf is larger than 20 MB.")).toBeInTheDocument()
    await userEvent.upload(screen.getByLabelText(/Drag files here/), pdf("new.pdf"))
    expect(onAddFiles).toHaveBeenCalled()
  })
})
