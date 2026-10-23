import { DEFAULT_URL_STATE } from "./model"
import { MAX_RESTORE_ROWS, saveSnapshot, SNAPSHOT_STORAGE_KEY, SNAPSHOT_TTL_MS, snapshotKey, takeSnapshot } from "./restore"

const memory = () => {
  const map = new Map<string, string>()
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k), map }
}

describe("list position", () => {
  const state = { ...DEFAULT_URL_STATE, filters: { ...DEFAULT_URL_STATE.filters, q: "ana" } }
  const key = snapshotKey(state)

  it("ignores the open drawer in the key", () => {
    expect(snapshotKey({ ...state, deal: "a".repeat(24) })).toBe(key)
    expect(key).toBe("q=ana")
  })

  it("gives the position back once, for the same list", () => {
    const store = memory()
    saveSnapshot({ key, tab: "deals", count: 150, scrollTop: 900, savedAt: 1000 }, store)
    expect(takeSnapshot(key, 2000, store)).toEqual({ key, tab: "deals", count: 150, scrollTop: 900, savedAt: 1000 })
    expect(store.map.has(SNAPSHOT_STORAGE_KEY)).toBe(false)
    expect(takeSnapshot(key, 2000, store)).toBeNull()
  })

  it("drops a position of another list, a stale one or a broken one", () => {
    const store = memory()
    saveSnapshot({ key: "q=bruno", tab: "deals", count: 50, scrollTop: 10, savedAt: 1000 }, store)
    expect(takeSnapshot(key, 2000, store)).toBeNull()
    saveSnapshot({ key, tab: "deals", count: 50, scrollTop: 10, savedAt: 1000 }, store)
    expect(takeSnapshot(key, 1000 + SNAPSHOT_TTL_MS + 1, store)).toBeNull()
    store.setItem(SNAPSHOT_STORAGE_KEY, "{not json")
    expect(takeSnapshot(key, 2000, store)).toBeNull()
  })

  it("caps how many rows it asks to reload", () => {
    const store = memory()
    saveSnapshot({ key, tab: "contacts", count: 10_000, scrollTop: 50, savedAt: 1000 }, store)
    expect(takeSnapshot(key, 2000, store)?.count).toBe(MAX_RESTORE_ROWS)
  })

  it("survives blocked storage", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked")
      },
      setItem: () => {
        throw new Error("blocked")
      },
      removeItem: () => undefined,
    }
    expect(() => saveSnapshot({ key, tab: "deals", count: 1, scrollTop: 1, savedAt: 1 }, blocked)).not.toThrow()
    expect(takeSnapshot(key, 2, blocked)).toBeNull()
  })
})
