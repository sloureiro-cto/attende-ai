import { cleanStageName, columnStatusOf, kindOfColumnStatus, moveItem, nextBoardIndex, reorderUpdates, sortStages, type StageSetting } from "./stages"

const s = (id: string, boardIndex: string): StageSetting => ({ id, name: id, kind: "open", boardIndex })

describe("stage kinds", () => {
  it("reads the column status the way the funnel API does", () => {
    expect(kindOfColumnStatus("todo")).toBe("open")
    expect(kindOfColumnStatus("inProgress")).toBe("open")
    expect(kindOfColumnStatus("win")).toBe("won")
    expect(kindOfColumnStatus("done")).toBe("won")
    expect(kindOfColumnStatus("lost")).toBe("lost")
    expect(kindOfColumnStatus(undefined)).toBe("open")
  })

  it("writes a status for each kind", () => {
    expect(columnStatusOf("open")).toBe("inProgress")
    expect(columnStatusOf("won")).toBe("win")
    expect(columnStatusOf("lost")).toBe("lost")
  })
})

describe("stage names", () => {
  it("collapses spaces and refuses empty or long names", () => {
    expect(cleanStageName("  Proposal   sent ")).toBe("Proposal sent")
    expect(cleanStageName("   ")).toBeNull()
    expect(cleanStageName("x".repeat(61))).toBeNull()
    expect(cleanStageName(3)).toBeNull()
  })
})

describe("stage order", () => {
  it("sorts by numeric board index", () => {
    expect(sortStages([s("b", "1500"), s("a", "500"), s("c", "2000")]).map((x) => x.id)).toEqual(["a", "b", "c"])
  })

  it("puts a new stage after the last one", () => {
    expect(nextBoardIndex([s("a", "0"), s("b", "2500.5")])).toBe("3500")
    expect(nextBoardIndex([])).toBe("0")
  })

  it("moves a stage with one midpoint update", () => {
    const list = [s("a", "0"), s("b", "1000"), s("c", "2000")]
    expect(reorderUpdates(list, 2, -1)).toEqual([{ id: "c", boardIndex: "500" }])
    expect(reorderUpdates(list, 0, 1)).toEqual([{ id: "a", boardIndex: "1500" }])
    expect(reorderUpdates(list, 1, -1)).toEqual([{ id: "b", boardIndex: "-1000" }])
    expect(reorderUpdates(list, 2, 1)).toEqual([])
  })

  it("renumbers every stage when the neighbours leave no room", () => {
    const list = [s("a", "0"), s("b", "0"), s("c", "x")]
    expect(reorderUpdates(list, 2, -1)).toEqual([
      { id: "c", boardIndex: "1000" },
      { id: "b", boardIndex: "2000" },
    ])
  })

  it("moves an item of a list", () => {
    expect(moveItem([1, 2, 3], 2, 0)).toEqual([3, 1, 2])
    expect(moveItem([1, 2, 3], 0, 5)).toEqual([1, 2, 3])
  })
})
