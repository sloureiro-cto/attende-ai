import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { WorkspacePicker } from "./WorkspacePicker"

const push = jest.fn()
const refresh = jest.fn()
const update = jest.fn(async () => null)

jest.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }))
jest.mock("next-auth/react", () => ({ useSession: () => ({ update }) }))
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
jest.mock("app/utils/showToast", () => ({ showToast: jest.fn() }))

const workspaces = [
  { _id: "a", name: "Alpha", entitlements: { advancedAutomations: true }, members: [1, 2] },
  { _id: "b", name: "Beta", entitlements: { advancedAutomations: false }, members: [] },
  { _id: "c", name: "Gamma", members: [1] },
]

describe("WorkspacePicker", () => {
  beforeEach(() => jest.clearAllMocks())

  it("lists only the workspaces that have bots", () => {
    render(<WorkspacePicker workspaces={workspaces} currentWorkspaceId="a" />)
    expect(screen.getByText("Alpha")).toBeInTheDocument()
    expect(screen.getByText("Gamma")).toBeInTheDocument()
    expect(screen.queryByText("Beta")).not.toBeInTheDocument()
    expect(screen.getByText("2 members")).toBeInTheDocument()
  })

  it("marks the current workspace", () => {
    render(<WorkspacePicker workspaces={workspaces} currentWorkspaceId="a" />)
    expect(screen.getByText("Current")).toBeInTheDocument()
  })

  it("switching re-issues the session for the chosen workspace, then opens bots", async () => {
    render(<WorkspacePicker workspaces={workspaces} currentWorkspaceId="a" />)
    fireEvent.click(screen.getByRole("button", { name: /Open company: Gamma/ }))
    await waitFor(() => expect(push).toHaveBeenCalledWith("/bots"))
    expect(update).toHaveBeenCalledWith({ workspaceId: "c" })
  })

  it("does not touch the session when the current workspace is chosen", async () => {
    render(<WorkspacePicker workspaces={workspaces} currentWorkspaceId="a" />)
    fireEvent.click(screen.getByRole("button", { name: /Open company: Alpha/ }))
    await waitFor(() => expect(push).toHaveBeenCalledWith("/bots"))
    expect(update).not.toHaveBeenCalled()
  })

  it("shows the empty state when none is entitled", () => {
    render(<WorkspacePicker workspaces={[workspaces[1]!]} currentWorkspaceId="b" />)
    expect(screen.getByText("None of your companies has Attende-ai yet.")).toBeInTheDocument()
  })

  it("shows a retry when the list could not be loaded", () => {
    render(<WorkspacePicker workspaces={[]} loadFailed />)
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(refresh).toHaveBeenCalled()
  })
})
