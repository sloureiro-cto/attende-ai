import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { WorkspaceSwitcher } from "./WorkspaceSwitcher"

const push = jest.fn()
const refresh = jest.fn()
const update = jest.fn(async () => null)

jest.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }))
jest.mock("next-auth/react", () => ({ useSession: () => ({ update }) }))
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
jest.mock("app/utils/showToast", () => ({ showToast: jest.fn() }))
jest.mock("context/WorkspaceContext", () => ({
  useWorkspace: () => ({
    workspaces: [
      { _id: "a", name: "Alpha", entitlements: { advancedAutomations: true } },
      { _id: "b", name: "Beta", entitlements: { advancedAutomations: false } },
      { _id: "c", name: "Gamma" },
    ],
    selectedWorkspace: { _id: "a", name: "Alpha" },
  }),
}))

const open = async () => {
  const trigger = screen.getByRole("button", { name: /Company: Alpha/ })
  await act(async () => {
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" })
    fireEvent.keyDown(trigger, { key: "Enter" })
  })
}

describe("WorkspaceSwitcher", () => {
  beforeEach(() => jest.clearAllMocks())

  it("lists all the user's companies, not only those with a JSYNQ entitlement flag", async () => {
    render(<WorkspaceSwitcher />)
    await open()
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Alpha", "Beta", "Gamma", "All companies"])
  })

  it("switching re-issues the session for the chosen company", async () => {
    render(<WorkspaceSwitcher />)
    await open()
    fireEvent.click(screen.getByRole("menuitem", { name: "Beta" }))
    await waitFor(() => expect(update).toHaveBeenCalledWith({ workspaceId: "b" }))
    expect(push).toHaveBeenCalledWith("/bots")
  })
})
