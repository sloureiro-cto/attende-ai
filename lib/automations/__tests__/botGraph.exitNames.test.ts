import { exitDisplayName } from "../botGraph"
import type { AdvancedAutomationNode } from "../types"

const condition = {
  id: "c1",
  kind: "condition",
  position: { x: 0, y: 0 },
  rows: [
    { id: "r_5e7dd88f4", name: "", condition: {} },
    { id: "r_b32323be9", name: "  Cliente VIP ", condition: {} },
  ],
} as unknown as AdvancedAutomationNode

describe("exitDisplayName", () => {
  it("numbers an unnamed condition rule instead of exposing its id", () => {
    expect(exitDisplayName(condition, "r_5e7dd88f4")).toEqual({ unnamed: { key: "advancedAutomationRuleName", n: 1 } })
  })
  it("keeps the author's name, trimmed", () => {
    expect(exitDisplayName(condition, "r_b32323be9")).toEqual({ name: "Cliente VIP" })
  })
  it("uses the fixed name of the fallback exit", () => {
    expect(exitDisplayName(condition, "none")).toEqual({ fixedKey: "none" })
  })
  it("numbers unnamed split paths and buttons", () => {
    const split = { id: "s", kind: "split", position: { x: 0, y: 0 }, paths: [{ id: "p_a", name: "A", percent: 50 }, { id: "p_b", name: "", percent: 50 }] } as unknown as AdvancedAutomationNode
    expect(exitDisplayName(split, "p_b")).toEqual({ unnamed: { key: "automationsEditorDefaultPathName", n: 2 } })
    const msg = { id: "m", kind: "send_message", position: { x: 0, y: 0 }, text: "oi", replyMode: "buttons", options: [{ id: "o_x", label: " " }] } as unknown as AdvancedAutomationNode
    expect(exitDisplayName(msg, "o_x")).toEqual({ unnamed: { key: "advancedAutomationOptionLabel", n: 1 } })
  })
})
