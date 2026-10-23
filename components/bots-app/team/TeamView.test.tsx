import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TeamActions } from "./teamActions"
import { TeamView, TeamViewData } from "./TeamView"

const refresh = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: jest.fn() }), usePathname: () => "/team" }))
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
const showToast = jest.fn()
jest.mock("app/utils/showToast", () => ({ showToast: (...a: unknown[]) => showToast(...a) }))
// The real actions import server-only code; the view receives its own `actions` in every test.
jest.mock("./teamActions", () => ({ defaultTeamActions: {} }))

const role = (id: string, name: string) => ({ _id: id, name, entityType: "workspace" as const, roleType: "default" as never })
const ROLES = [role("r-admin", "Admin"), role("r-collab", "Collaborator"), role("r-viewer", "Viewer")]

const baseData = (over: Partial<TeamViewData> = {}): TeamViewData => ({
  members: [
    { id: "u1", name: "Ana Souza", email: "ana@x.co", roleName: "Admin" },
    { id: "u2", name: "Bruno Lima", email: "bruno@x.co", roleName: "Collaborator" },
  ],
  invites: [{ id: "i1", email: "carla@x.co", roleName: "Collaborator", status: "pending", createdAt: "2026-10-20T00:00:00Z" }],
  roles: ROLES,
  seatLimit: 5,
  failed: false,
  rolesFailed: false,
  ...over,
})

const makeActions = (over: Partial<TeamActions> = {}): jest.Mocked<TeamActions> => ({
  invite: jest.fn().mockResolvedValue({ ok: true }),
  revokeInvite: jest.fn().mockResolvedValue({ ok: true }),
  removeMember: jest.fn().mockResolvedValue({ ok: true }),
  ...over,
}) as jest.Mocked<TeamActions>

const setup = (data = baseData(), actions = makeActions()) => {
  render(<TeamView data={data} workspaceId="w1" currentUserId="u1" actions={actions} />)
  return actions
}

beforeEach(() => jest.clearAllMocks())

describe("TeamView: listing", () => {
  it("lists members with a plain-language role and marks the current user", () => {
    setup()
    expect(screen.getByText("Ana Souza")).toBeInTheDocument()
    expect(screen.getByText("You")).toBeInTheDocument()
    expect(screen.getByText("Bruno Lima")).toBeInTheDocument()
    expect(screen.getAllByText("Support").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Admin").length).toBeGreaterThan(0)
  })

  it("lists pending invites separately", () => {
    setup()
    const pending = screen.getByRole("heading", { name: /Pending invites/ }).closest("section") as HTMLElement
    expect(within(pending).getByText("carla@x.co")).toBeInTheDocument()
    expect(within(pending).getByText("Invited")).toBeInTheDocument()
  })

  it("shows the empty hint with the booking CTA when it is only you", () => {
    setup(baseData({ members: [{ id: "u1", name: "Ana", email: "ana@x.co", roleName: "Admin" }], invites: [] }))
    expect(screen.getByText("It is just you for now")).toBeInTheDocument()
    const cta = screen.getByRole("link", { name: "Book a demo or training" })
    expect(cta).toHaveAttribute("href", "https://app.jsynq.com/book/uUcE1FEPp94")
    expect(cta).toHaveAttribute("target", "_blank")
    expect(cta).toHaveAttribute("rel", expect.stringContaining("noopener"))
  })

  it("shows a retry state when members could not be loaded", () => {
    setup(baseData({ failed: true, members: [] }))
    expect(screen.getByText("We could not load your team.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(refresh).toHaveBeenCalled()
  })
})

describe("TeamView: inviting", () => {
  const fill = (email: string) => fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } })

  it("sends the invite with the mapped role id (support agent by default) and shows it right away", async () => {
    const actions = setup()
    fill("novo@x.co")
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Send invite" })))
    expect(actions.invite).toHaveBeenCalledWith({ workspaceId: "w1", email: "novo@x.co", roleId: "r-collab" })
    expect(showToast).toHaveBeenCalledWith("success", "Invite sent to novo@x.co")
    expect(refresh).toHaveBeenCalled()
    expect(screen.getByText("novo@x.co")).toBeInTheDocument()
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("")
  })

  it("maps the Admin choice to the Admin role", async () => {
    const actions = setup()
    fill("chefe@x.co")
    fireEvent.click(screen.getByRole("radio", { name: /Admin/ }))
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Send invite" })))
    expect(actions.invite).toHaveBeenCalledWith({ workspaceId: "w1", email: "chefe@x.co", roleId: "r-admin" })
  })

  it("rejects an invalid email without calling the backend", async () => {
    const actions = setup()
    fill("not-an-email")
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Send invite" })))
    expect(actions.invite).not.toHaveBeenCalled()
    expect(screen.getByText("Enter a valid email")).toBeInTheDocument()
  })

  it("rejects someone who is already a member or already invited", async () => {
    const actions = setup()
    fill("BRUNO@x.co")
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Send invite" })))
    expect(screen.getByText("This person is already on the team or invited")).toBeInTheDocument()
    fill("carla@x.co")
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Send invite" })))
    expect(actions.invite).not.toHaveBeenCalled()
  })

  it("shows a translated error (never the raw API text) and keeps the typed email", async () => {
    const actions = setup(baseData(), makeActions({ invite: jest.fn().mockResolvedValue({ ok: false, error: "No seats" }) }))
    fill("novo@x.co")
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Send invite" })))
    expect(actions.invite).toHaveBeenCalled()
    expect(screen.getByText("Something went wrong. Try again.")).toBeInTheDocument()
    expect(screen.queryByText("No seats")).not.toBeInTheDocument()
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("novo@x.co")
  })

  it("blocks inviting when the plan has no free seats and points to billing", () => {
    setup(baseData({ seatLimit: 3 }))
    expect(screen.getByRole("alert")).toHaveTextContent("Your plan has no free seats")
    expect(screen.getByRole("link", { name: "See plans" })).toHaveAttribute("href", "/billing")
    expect(screen.getByLabelText("Email")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Send invite" })).toBeDisabled()
  })

  it("does not enforce seats when the plan limit is unknown", () => {
    setup(baseData({ seatLimit: null }))
    expect(screen.getByLabelText("Email")).not.toBeDisabled()
    expect(screen.queryByText(/no free seats/)).not.toBeInTheDocument()
  })

  it("refuses to send when roles could not be loaded", () => {
    setup(baseData({ rolesFailed: true, roles: [] }))
    expect(screen.getAllByText("Roles could not be loaded. Try again.").length).toBeGreaterThan(0)
    expect(screen.getByLabelText("Email")).toBeDisabled()
  })
})

describe("TeamView: roles, permissions and seats", () => {
  it("never treats a custom role called Admin as an admin, and keeps its own name", () => {
    const roles = [...ROLES.filter((r) => r.name !== "Admin"), { _id: "r-custom", name: "Admin", entityType: "workspace" as const, roleType: "custom" as never }]
    setup(baseData({ roles, members: [{ id: "u1", name: "Ana Souza", email: "ana@x.co", roleName: "Admin" }], invites: [] }))
    expect(screen.getAllByText("Admin (custom role)").length).toBeGreaterThan(0)
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument()
    expect(screen.getByText("Only the owner and admins can invite or remove people.")).toBeInTheDocument()
  })

  it("shows the owner and never offers to remove them", () => {
    setup(baseData({ members: [{ id: "u1", name: "Ana Souza", email: "ana@x.co", roleName: "Admin" }, { id: "u9", name: "Olga Dona", email: "olga@x.co", roleName: "Owner" }], invites: [] }))
    expect(screen.getAllByText("Owner").length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: "Actions for Olga Dona" })).not.toBeInTheDocument()
  })

  it("explains an over-limit team: nobody loses access, new invites pause", () => {
    const members = Array.from({ length: 10 }, (_, i) => ({ id: i === 0 ? "u1" : `m${i}`, name: `Person ${i}`, email: `p${i}@x.co`, roleName: i === 0 ? "Admin" : "Collaborator" }))
    setup(baseData({ members, invites: [], seatLimit: 5 }))
    expect(screen.getByText(/Your team has 10 people and your plan includes 5\. Nobody loses access/)).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toBeDisabled()
  })
})

describe("TeamView: invite and member actions", () => {
  const openMenu = async (name: string) => {
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name }))
    return user
  }

  it("revokes a pending invite", async () => {
    const actions = setup()
    const user = await openMenu("Actions for carla@x.co")
    await user.click(await screen.findByRole("menuitem", { name: "Revoke" }))
    await waitFor(() => expect(actions.revokeInvite).toHaveBeenCalledWith({ inviteId: "i1", status: "pending" }))
    await waitFor(() => expect(screen.queryByText("carla@x.co")).not.toBeInTheDocument())
    expect(showToast).toHaveBeenCalledWith("success", "Invite revoked")
  })

  it("resends by revoking the old invite and sending a new one with the same role", async () => {
    const actions = setup()
    const user = await openMenu("Actions for carla@x.co")
    await user.click(await screen.findByRole("menuitem", { name: "Resend" }))
    await waitFor(() => expect(actions.invite).toHaveBeenCalledWith({ workspaceId: "w1", email: "carla@x.co", roleId: "r-collab" }))
    expect(actions.revokeInvite).toHaveBeenCalledWith({ inviteId: "i1", status: "pending" })
    expect(showToast).toHaveBeenCalledWith("success", "Invite resent to carla@x.co")
  })

  it("asks for confirmation before removing a member, and removes only after confirming", async () => {
    const actions = setup()
    const user = await openMenu("Actions for Bruno Lima")
    await user.click(await screen.findByRole("menuitem", { name: "Remove" }))
    expect(await screen.findByText("Remove Bruno Lima?")).toBeInTheDocument()
    expect(actions.removeMember).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Remove" }))
    await waitFor(() => expect(actions.removeMember).toHaveBeenCalledWith({ workspaceId: "w1", memberId: "u2" }))
    await waitFor(() => expect(screen.queryByText("Bruno Lima")).not.toBeInTheDocument())
  })

  it("does not remove when the confirmation is canceled", async () => {
    const actions = setup()
    const user = await openMenu("Actions for Bruno Lima")
    await user.click(await screen.findByRole("menuitem", { name: "Remove" }))
    await user.click(await screen.findByRole("button", { name: "Cancel" }))
    expect(actions.removeMember).not.toHaveBeenCalled()
    expect(screen.getByText("Bruno Lima")).toBeInTheDocument()
  })

  it("does not offer actions on yourself", () => {
    setup()
    expect(screen.queryByRole("button", { name: "Actions for Ana Souza" })).not.toBeInTheDocument()
  })

  it("keeps the member and shows an error when the backend refuses", async () => {
    const actions = setup(baseData(), makeActions({ removeMember: jest.fn().mockResolvedValue({ ok: false, error: "Not allowed" }) }))
    const user = await openMenu("Actions for Bruno Lima")
    await user.click(await screen.findByRole("menuitem", { name: "Remove" }))
    await user.click(await screen.findByRole("button", { name: "Remove" }))
    await waitFor(() => expect(actions.removeMember).toHaveBeenCalled())
    expect(showToast).toHaveBeenCalledWith("error", "Something went wrong. Try again.")
    expect(screen.getByText("Bruno Lima")).toBeInTheDocument()
  })
})
