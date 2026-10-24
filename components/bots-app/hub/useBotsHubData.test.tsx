import { act, renderHook, waitFor } from "@testing-library/react"
import type { AdvancedAutomationListItem, AdvancedAutomationListResponse } from "lib/automations/types"
import { useBotsHubData } from "./useBotsHubData"

const listAction = jest.fn()
jest.mock("actions/messaging-automations/advancedAutomations", () => ({ listAdvancedAutomationsAction: (...args: unknown[]) => listAction(...args) }))

const bot = (id: string, status = "active"): AdvancedAutomationListItem =>
  ({ id, name: id, status, channels: [], stepCount: 1, version: 1, updatedAt: "t", stats30d: { started: 0, completed: 0 } }) as AdvancedAutomationListItem
const page = (ids: string[], total = ids.length): AdvancedAutomationListResponse => ({
  items: ids.map((id) => bot(id)),
  total,
  page: 1,
  limit: 25,
  totals: { all: total, active: total, paused: 0, draft: 0 },
})

beforeEach(() => listAction.mockReset())

describe("useBotsHubData", () => {
  it("starts from the server data without fetching", () => {
    const { result } = renderHook(() => useBotsHubData({ data: page(["a", "b"]), failed: false }))
    expect(result.current.items.map((b) => b.id)).toEqual(["a", "b"])
    expect(listAction).not.toHaveBeenCalled()
  })

  it("refetches on a channel change, from page 1, and passes the filters to the action", async () => {
    listAction.mockResolvedValueOnce({ success: true, data: page(["wa"]) })
    const { result } = renderHook(() => useBotsHubData({ data: page(["a", "b"], 60), failed: false }))
    act(() => result.current.setPage(3))
    listAction.mockResolvedValueOnce({ success: true, data: page(["wa"]) })
    act(() => result.current.setChannel("whatsapp"))
    expect(result.current.page).toBe(1)
    await waitFor(() => expect(result.current.items.map((b) => b.id)).toEqual(["wa"]))
    expect(listAction).toHaveBeenLastCalledWith({ q: "", channel: "whatsapp", page: 1, limit: 25 })
    expect(result.current.filtering).toBe(true)
  })

  it("only the latest request may write state (a slow stale response is ignored)", async () => {
    let resolveSlow: (v: unknown) => void = () => undefined
    listAction.mockReturnValueOnce(new Promise((r) => (resolveSlow = r)))
    listAction.mockResolvedValueOnce({ success: true, data: page(["fresh"]) })
    const { result } = renderHook(() => useBotsHubData({ data: page(["a"]), failed: false }))
    act(() => result.current.setChannel("sms"))
    await waitFor(() => expect(listAction).toHaveBeenCalledTimes(1))
    act(() => result.current.setChannel("instagram"))
    await waitFor(() => expect(result.current.items.map((b) => b.id)).toEqual(["fresh"]))
    await act(async () => resolveSlow({ success: true, data: page(["stale"]) }))
    expect(result.current.items.map((b) => b.id)).toEqual(["fresh"])
  })

  it("a failed reload keeps the last good list and reports the failure", async () => {
    listAction.mockResolvedValueOnce({ success: false, error: "" })
    const { result } = renderHook(() => useBotsHubData({ data: page(["a"]), failed: false }))
    act(() => result.current.setChannel("sms"))
    await waitFor(() => expect(result.current.failed).toBe(true))
    expect(result.current.items.map((b) => b.id)).toEqual(["a"])
  })

  it("patches a bot optimistically", () => {
    const { result } = renderHook(() => useBotsHubData({ data: page(["a", "b"]), failed: false }))
    act(() => result.current.patchBot("b", { status: "paused" }))
    expect(result.current.items.find((b) => b.id === "b")?.status).toBe("paused")
    expect(result.current.items.find((b) => b.id === "a")?.status).toBe("active")
  })
})
