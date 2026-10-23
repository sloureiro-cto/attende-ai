import { formatBytes, validateUpload } from "../files"
import { uploadKnowledgeFile } from "../upload"
import { initialQueue, queueReducer } from "../uploadQueue"

const MB = 1024 * 1024
const file = (name: string, size: number): File => Object.defineProperty(new File(["x"], name), "size", { value: size })

describe("upload validation", () => {
  it("rejects empty, too large, unsupported and duplicate files", () => {
    expect(validateUpload({ name: "a.pdf", size: 0 }, [], 20 * MB)).toBe("empty")
    expect(validateUpload({ name: "a.pdf", size: 21 * MB }, [], 20 * MB)).toBe("size")
    expect(validateUpload({ name: "a.exe", size: 10 }, [], 20 * MB)).toBe("type")
    expect(validateUpload({ name: "A.PDF", size: 10 }, ["a.pdf"], 20 * MB)).toBe("duplicate")
    expect(validateUpload({ name: "prices.xlsx", size: 10 }, [], 20 * MB)).toBeNull()
  })

  it("formats sizes in plain units", () => {
    expect(formatBytes(500)).toBe("500 B")
    expect(formatBytes(2048)).toBe("2 KB")
    expect(formatBytes(1.5 * MB)).toBe("1.5 MB")
    expect(formatBytes(1.5 * MB, "portuguese")).toBe("1,5 MB")
  })
})

describe("upload queue", () => {
  it("queues valid files, reports rejected ones and tracks progress", () => {
    let state = queueReducer(initialQueue, { type: "add", files: [file("a.pdf", 10), file("b.exe", 10), file("c.pdf", 30 * MB)], existingNames: [], maxBytes: 20 * MB, idFor: () => "id-a" })
    expect(state.items.map((i) => i.name)).toEqual(["a.pdf"])
    expect(state.rejected).toEqual([
      { name: "b.exe", issue: "type" },
      { name: "c.pdf", issue: "size" },
    ])
    state = queueReducer(state, { type: "start", id: "id-a" })
    state = queueReducer(state, { type: "progress", id: "id-a", percent: 42.4 })
    expect(state.items[0]).toMatchObject({ status: "uploading", percent: 42 })
    state = queueReducer(state, { type: "failed", id: "id-a", error: { success: false, status: 0 } })
    expect(state.items[0]!.status).toBe("failed")
    state = queueReducer(state, { type: "retry", id: "id-a" })
    expect(state.items[0]).toMatchObject({ status: "queued", percent: 0 })
  })
})

describe("uploadKnowledgeFile", () => {
  const fakeXhr = (status: number, body: unknown) => {
    const xhr = {
      upload: { onprogress: null as null | ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) },
      onload: null as null | (() => void),
      onerror: null,
      ontimeout: null,
      onabort: null,
      status,
      responseText: JSON.stringify(body),
      timeout: 0,
      open: jest.fn(),
      setRequestHeader: jest.fn(),
      abort: jest.fn(),
      send: jest.fn(() => {
        xhr.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 })
        xhr.onload?.()
      }),
    }
    return xhr
  }

  it("reports progress and resolves with the document", async () => {
    const progress = jest.fn()
    const xhr = fakeXhr(201, { success: true, data: { documentId: "d1", name: "a.pdf" } })
    const result = await uploadKnowledgeFile("a1", new File(["x"], "a.pdf"), progress, () => xhr as never)
    expect(xhr.open).toHaveBeenCalledWith("POST", "/ai-agents/a1/knowledge")
    expect(progress).toHaveBeenCalledWith(50)
    expect(result).toEqual({ success: true, data: { documentId: "d1", name: "a.pdf" } })
  })

  it("keeps the backend code on failure", async () => {
    const xhr = fakeXhr(403, { success: false, status: 403, code: "ATTENDE_QUOTA_EXCEEDED", details: { resource: "docs" } })
    const result = await uploadKnowledgeFile("a1", new File(["x"], "a.pdf"), undefined, () => xhr as never)
    expect(result).toMatchObject({ success: false, status: 403, code: "ATTENDE_QUOTA_EXCEEDED", details: { resource: "docs" } })
  })
})
