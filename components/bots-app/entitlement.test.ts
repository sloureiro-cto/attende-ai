import { filterEntitled, isWorkspaceEntitled } from "./entitlement"

describe("isWorkspaceEntitled", () => {
  it("is true only when entitlements.bots is true", () => {
    expect(isWorkspaceEntitled({ _id: "1", entitlements: { bots: true } })).toBe(true)
    expect(isWorkspaceEntitled({ _id: "1", entitlements: { bots: false } })).toBe(false)
    expect(isWorkspaceEntitled({ _id: "1", entitlements: {} })).toBe(false)
  })

  it("stays permissive while the backend has no entitlements field", () => {
    expect(isWorkspaceEntitled({ _id: "1" })).toBe(true)
    expect(isWorkspaceEntitled({ _id: "1", entitlements: null })).toBe(true)
  })

  it("is false without a workspace", () => {
    expect(isWorkspaceEntitled(null)).toBe(false)
    expect(isWorkspaceEntitled(undefined)).toBe(false)
  })
})

describe("filterEntitled", () => {
  it("keeps entitled workspaces only", () => {
    const list = [
      { _id: "a", entitlements: { bots: true } },
      { _id: "b", entitlements: { bots: false } },
      { _id: "c" },
    ]
    expect(filterEntitled(list).map((w) => w._id)).toEqual(["a", "c"])
  })
})
