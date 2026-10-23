import { clearDraft, loadDraft, newRequestId, saveDraft } from "../draft"

const memory = () => {
  const data = new Map<string, string>()
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k), data }
}

describe("agent drafts", () => {
  const draft = { templateKey: "sdr" as const, form: { businessName: "Clinic" }, lines: [], step: 2, clientRequestId: "req-12345678" }

  it("survives a reload and keeps the request id (idempotent create)", () => {
    const storage = memory()
    saveDraft("w1", draft, storage, 1000)
    expect(loadDraft("w1", "sdr", storage, 2000)).toMatchObject({ form: { businessName: "Clinic" }, step: 2, clientRequestId: "req-12345678" })
  })

  it("is scoped by workspace and model", () => {
    const storage = memory()
    saveDraft("w1", draft, storage, 1000)
    expect(loadDraft("w2", "sdr", storage, 2000)).toBeNull()
    expect(loadDraft("w1", "closer", storage, 2000)).toBeNull()
  })

  it("expires after a day and ignores garbage", () => {
    const storage = memory()
    saveDraft("w1", draft, storage, 0)
    expect(loadDraft("w1", "sdr", storage, 1000 * 60 * 60 * 25)).toBeNull()
    storage.setItem("attende.agent.draft.w1.sdr", "{nope")
    expect(loadDraft("w1", "sdr", storage)).toBeNull()
  })

  it("clears", () => {
    const storage = memory()
    saveDraft("w1", draft, storage)
    clearDraft("w1", "sdr", storage)
    expect(loadDraft("w1", "sdr", storage)).toBeNull()
  })

  it("makes long, unique request ids", () => {
    const a = newRequestId()
    expect(a.length).toBeGreaterThanOrEqual(8)
    expect(newRequestId()).not.toBe(a)
  })
})
