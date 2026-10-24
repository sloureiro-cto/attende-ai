import { render, screen } from "@testing-library/react"
import { initialsOf } from "./AccountMenu"
import { BotsShell } from "./BotsShell"

let pathname = "/bots"

jest.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }))
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { name: "Ana Souza", email: "ana@x.co" } }, update: jest.fn() }),
  signOut: jest.fn(),
}))
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
jest.mock("context/WorkspaceContext", () => ({
  useWorkspace: () => ({
    workspaces: [{ _id: "a", name: "Alpha", entitlements: { advancedAutomations: true } }],
    selectedWorkspace: { _id: "a", name: "Alpha" },
  }),
}))
jest.mock("app/utils/showToast", () => ({ showToast: jest.fn() }))

describe("BotsShell", () => {
  it("renders brand, workspace, both nav links (desktop + mobile row) and content", () => {
    pathname = "/bots"
    render(
      <BotsShell>
        <p>page content</p>
      </BotsShell>
    )
    expect(screen.getByText("page content")).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: "Automations" }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("link", { name: "Channels" }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole("button", { name: /Company: Alpha/ })).toHaveLength(2)
    for (const account of screen.getAllByRole("button", { name: "Account menu" })) expect(account).toHaveTextContent("AS")
  })

  it("marks the active section from the pathname", () => {
    pathname = "/bots/abc/stats"
    render(<BotsShell>x</BotsShell>)
    for (const link of screen.getAllByRole("link", { name: "Automations" })) {
      expect(link).toHaveAttribute("aria-current", "page")
    }
    for (const link of screen.getAllByRole("link", { name: "Channels" })) {
      expect(link).not.toHaveAttribute("aria-current")
    }
  })

  it("offers a skip link to the main region and hides the lines pill unless given", () => {
    pathname = "/bots"
    render(<BotsShell>x</BotsShell>)
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#bots-main")
    expect(screen.queryByLabelText(/Channels status/)).not.toBeInTheDocument()
  })

  it("shows the lines pill when status is provided", () => {
    pathname = "/bots"
    render(<BotsShell lines={{ state: "degraded", total: 3, offline: 1 }}>x</BotsShell>)
    const [sidebar, compact] = screen.getAllByLabelText(/Channels status/)
    expect(sidebar).toHaveTextContent("1 of 3 channels needs attention")
    expect(compact).toHaveAttribute("aria-label", "Channels status: 1 of 3 channels needs attention")
  })
})

describe("initialsOf", () => {
  it("uses two initials for a full name, the local part of an email otherwise", () => {
    expect(initialsOf("Ana Souza", null)).toBe("AS")
    expect(initialsOf(null, "ana.souza@x.co")).toBe("AS")
    expect(initialsOf("", "bob@x.co")).toBe("BO")
    expect(initialsOf(null, null)).toBe("?")
  })
})
