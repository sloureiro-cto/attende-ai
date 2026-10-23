import { page, row } from "./fixtures"
import { MAX_PARTIAL_FOLLOW_UPS } from "./model"
import { fetchNextPage } from "./paging"
import type { FunnelPage } from "./types"

const key = (r: { cardId: string }) => r.cardId
const ok = (p: FunnelPage) => ({ success: true as const, data: p })

describe("fetchNextPage", () => {
  it("appends a page and keeps the cursor", async () => {
    const fetchPage = jest.fn().mockResolvedValue(ok(page([row(3)], { nextCursor: "c2", hasMore: true })))
    const res = await fetchNextPage(fetchPage, [row(1), row(2)], "c1", key)
    expect(fetchPage).toHaveBeenCalledWith("c1")
    expect(res).toMatchObject({ ok: true, nextCursor: "c2", hasMore: true })
    expect(res?.items.map(key)).toEqual([row(1), row(2), row(3)].map(key))
  })

  it("keeps paging on its own after an empty partial page, then stops at the first rows", async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(ok(page([], { partial: true, hasMore: true, nextCursor: "c2" })))
      .mockResolvedValueOnce(ok(page([row(5)], { partial: true, hasMore: true, nextCursor: "c3" })))
    const res = await fetchNextPage(fetchPage, [], "c1", key)
    expect(fetchPage.mock.calls).toEqual([["c1"], ["c2"]])
    // A short partial page is not the end: the cursor is kept.
    expect(res).toMatchObject({ ok: true, hasMore: true, partial: true, nextCursor: "c3" })
    expect(res?.items).toHaveLength(1)
  })

  it("bounds the automatic follow-ups", async () => {
    const fetchPage = jest.fn().mockResolvedValue(ok(page([], { partial: true, hasMore: true, nextCursor: "cx" })))
    const res = await fetchNextPage(fetchPage, [], null, key)
    expect(fetchPage).toHaveBeenCalledTimes(MAX_PARTIAL_FOLLOW_UPS + 1)
    expect(res).toMatchObject({ ok: true, hasMore: true })
  })

  it("does not trust hasMore without a cursor", async () => {
    const res = await fetchNextPage(jest.fn().mockResolvedValue(ok(page([row(1)], { hasMore: true, nextCursor: null }))), [], null, key)
    expect(res).toMatchObject({ ok: true, hasMore: false, nextCursor: null })
  })

  it("returns the error and keeps what was already loaded", async () => {
    const res = await fetchNextPage(jest.fn().mockResolvedValue({ success: false, status: 500 }), [row(1)], "c1", key)
    expect(res).toMatchObject({ ok: false, error: { status: 500 } })
    expect(res?.items).toHaveLength(1)
  })

  it("drops answers of a superseded walk", async () => {
    const res = await fetchNextPage(jest.fn().mockResolvedValue(ok(page([row(1)]))), [], null, key, () => false)
    expect(res).toBeNull()
  })
})
