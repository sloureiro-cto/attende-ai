/**
 * @jest-environment node
 */
import { funnelTablePath, onBoardResult } from "./board"

const mockAuth = jest.fn()
const mockGet = jest.fn()
jest.mock("auth", () => ({ auth: () => mockAuth() }))
jest.mock("lib/attende/serverApi", () => ({ jsynqGet: (...a: unknown[]) => mockGet(...a) }))

const BOARD = "abcdef0123456789abcdef01"
const PROJECT = "0123456789abcdef01234567"
let user = 0

beforeEach(() => {
  jest.clearAllMocks()
  // A new user per test: the cache is per user and workspace.
  user += 1
  mockAuth.mockResolvedValue({ user: { id: `u${user}`, workspaceId: "w1" } })
})

describe("funnel default board", () => {
  it("resolves the default CRM board once and builds the table path", async () => {
    mockGet.mockResolvedValue({ success: true, data: { boardId: BOARD, projectId: PROJECT } })
    expect(await funnelTablePath()).toEqual({ success: true, data: `/crm/boards/${BOARD}/table` })
    expect(await funnelTablePath()).toEqual({ success: true, data: `/crm/boards/${BOARD}/table` })
    expect(mockGet).toHaveBeenCalledTimes(1)
    expect(mockGet).toHaveBeenCalledWith("/crm/boards/default")
  })

  it("passes a missing board on as 404 (the page shows 'no funnel')", async () => {
    mockGet.mockResolvedValue({ success: false, status: 404, reference: "BOARD_NOT_FOUND" })
    expect(await funnelTablePath()).toMatchObject({ success: false, status: 404, reference: "BOARD_NOT_FOUND" })
    mockGet.mockResolvedValue({ success: true, data: { boardId: "nope", projectId: PROJECT } })
    expect(await funnelTablePath()).toMatchObject({ success: false, status: 404, reference: "FUNNEL_NO_BOARD" })
  })

  it("forgets the board after a 404 from the table so the next call resolves it again", async () => {
    mockGet.mockResolvedValue({ success: true, data: { boardId: BOARD, projectId: PROJECT } })
    await funnelTablePath()
    await onBoardResult({ success: false, status: 404 })
    await funnelTablePath()
    expect(mockGet).toHaveBeenCalledTimes(2)
  })
})
