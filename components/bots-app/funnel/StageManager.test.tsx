import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { plural } from "lib/attende/format"
import { id } from "lib/attende/funnel/fixtures"
import type { StageSetting } from "lib/attende/funnel/stages"
import type { FunnelStageWithCount } from "lib/attende/funnel/types"
import { translateAttendeFunnel } from "lib/i18n/translations/attende/funnel"
import { StageManager } from "./StageManager"

const loadFunnelStageSettingsAction = jest.fn()
const createFunnelStageAction = jest.fn()
const updateFunnelStageAction = jest.fn()
const deleteFunnelStageAction = jest.fn()
jest.mock("actions/attende/funnel", () => ({
  loadFunnelStageSettingsAction: (...a: unknown[]) => loadFunnelStageSettingsAction(...a),
  createFunnelStageAction: (...a: unknown[]) => createFunnelStageAction(...a),
  updateFunnelStageAction: (...a: unknown[]) => updateFunnelStageAction(...a),
  deleteFunnelStageAction: (...a: unknown[]) => deleteFunnelStageAction(...a),
}))

type Key = Parameters<typeof translateAttendeFunnel>[1]
const t = (key: Key, r?: Record<string, string | number>) => translateAttendeFunnel("english", key, r)
const tn = (one: Key, other: Key, count: number, r?: Record<string, string | number>) =>
  plural(count, "english", { one: t(one, { ...r, count: "{count}" }), other: t(other, { ...r, count: "{count}" }) })
const ok = <T,>(data: T) => ({ success: true as const, data })
const fail = (status = 500) => ({ success: false as const, status })

const s = (n: number, over: Partial<StageSetting> = {}): StageSetting => ({ id: id(100 + n), name: `Stage ${n}`, kind: "open", boardIndex: String(n * 1000), ...over })
const settings = (stages: StageSetting[]) => ok({ projectId: id(8), boardId: id(9), stages })
const counts: FunnelStageWithCount[] = [
  { id: id(101), name: "Stage 1", color: null, order: 0, kind: "open", count: 3 },
  { id: id(102), name: "Stage 2", color: null, order: 1, kind: "open", count: 0 },
]

const onChanged = jest.fn()
const renderIt = () => render(<StageManager open onOpenChange={() => undefined} counts={counts} t={t} tn={tn} language="english" onChanged={onChanged} />)
const rows = () => screen.getAllByTestId("stage-row")

beforeEach(() => jest.clearAllMocks())

describe("StageManager", () => {
  it("lists the stages in board order with their type", async () => {
    loadFunnelStageSettingsAction.mockResolvedValue(settings([s(1), s(2, { kind: "won" }), s(3, { kind: "lost" })]))
    renderIt()
    await waitFor(() => expect(rows()).toHaveLength(3))
    expect(screen.getByRole("textbox", { name: "Name of the stage Stage 1" })).toHaveValue("Stage 1")
    expect(screen.getByRole("combobox", { name: "Type of the stage Stage 2" })).toHaveValue("won")
    expect(screen.getByRole("combobox", { name: "Type of the stage Stage 3" })).toHaveValue("lost")
    expect(screen.getByRole("button", { name: "Move Stage 1 up" })).toBeDisabled()
  })

  it("adds a stage with a name and a type at the end", async () => {
    loadFunnelStageSettingsAction.mockResolvedValue(settings([s(1), s(2)]))
    createFunnelStageAction.mockResolvedValue(ok(s(9, { name: "Proposal sent", kind: "won", boardIndex: "3000" })))
    renderIt()
    await waitFor(() => expect(rows()).toHaveLength(2))
    fireEvent.click(screen.getByRole("button", { name: "Add stage" }))
    expect(screen.getByText("Enter a name with up to 60 characters.")).toBeInTheDocument()
    expect(createFunnelStageAction).not.toHaveBeenCalled()
    fireEvent.change(screen.getByRole("textbox", { name: "Stage name" }), { target: { value: "  Proposal   sent " } })
    fireEvent.change(screen.getByRole("combobox", { name: "Type of the new stage" }), { target: { value: "won" } })
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Add stage" })))
    expect(createFunnelStageAction).toHaveBeenCalledWith({ name: "Proposal sent", kind: "won", boardIndex: "3000" })
    expect(rows()).toHaveLength(3)
    expect(screen.getByRole("status")).toHaveTextContent("Stage Proposal sent added at the end.")
    expect(onChanged).toHaveBeenCalledWith({ type: "created", stage: expect.objectContaining({ name: "Proposal sent", kind: "won" }) })
  })

  it("renames a stage on Enter", async () => {
    loadFunnelStageSettingsAction.mockResolvedValue(settings([s(1), s(2)]))
    updateFunnelStageAction.mockResolvedValue(ok({ id: id(101) }))
    renderIt()
    await waitFor(() => expect(rows()).toHaveLength(2))
    const input = screen.getByRole("textbox", { name: "Name of the stage Stage 1" })
    fireEvent.change(input, { target: { value: "First contact" } })
    await act(async () => fireEvent.keyDown(input, { key: "Enter" }))
    expect(updateFunnelStageAction).toHaveBeenCalledWith(id(101), { name: "First contact" })
    expect(onChanged).toHaveBeenCalledWith({ type: "updated", id: id(101), name: "First contact" })
    expect(screen.getByRole("status")).toHaveTextContent("Stage saved.")
  })

  it("changes the type of a stage, and rolls back when the server refuses", async () => {
    loadFunnelStageSettingsAction.mockResolvedValue(settings([s(1), s(2)]))
    updateFunnelStageAction.mockResolvedValueOnce(ok({ id: id(102) })).mockResolvedValueOnce(fail(500))
    renderIt()
    await waitFor(() => expect(rows()).toHaveLength(2))
    const kind = screen.getByRole("combobox", { name: "Type of the stage Stage 2" })
    await act(async () => fireEvent.change(kind, { target: { value: "lost" } }))
    expect(updateFunnelStageAction).toHaveBeenCalledWith(id(102), { kind: "lost" })
    expect(kind).toHaveValue("lost")
    expect(onChanged).toHaveBeenCalledWith({ type: "updated", id: id(102), kind: "lost" })
    await act(async () => fireEvent.change(kind, { target: { value: "won" } }))
    expect(kind).toHaveValue("lost")
    expect(screen.getByRole("alert")).toHaveTextContent("We could not save the stage. Try again.")
  })

  it("reorders with the arrows (one midpoint update)", async () => {
    loadFunnelStageSettingsAction.mockResolvedValue(settings([s(1), s(2), s(3)]))
    updateFunnelStageAction.mockResolvedValue(ok({ id: id(103) }))
    renderIt()
    await waitFor(() => expect(rows()).toHaveLength(3))
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Move Stage 3 up" })))
    expect(updateFunnelStageAction).toHaveBeenCalledWith(id(103), { boardIndex: "1500" })
    expect(rows().map((r) => within(r).getByRole("textbox")).map((i) => (i as HTMLInputElement).value)).toEqual(["Stage 1", "Stage 3", "Stage 2"])
    expect(onChanged).toHaveBeenCalledWith({ type: "reordered", ids: [id(101), id(103), id(102)] })
  })

  it("asks where the deals go before removing a stage, and requires a choice", async () => {
    loadFunnelStageSettingsAction.mockResolvedValue(settings([s(1), s(2)]))
    deleteFunnelStageAction.mockResolvedValue(ok({ id: id(101), moveTo: id(102) }))
    renderIt()
    await waitFor(() => expect(rows()).toHaveLength(2))
    fireEvent.click(screen.getByRole("button", { name: "Remove the stage Stage 1" }))
    const form = screen.getByRole("form", { name: "Remove the stage Stage 1" })
    expect(within(form).getByText("Stage 1 has 3 deals. They will move to the stage you choose.")).toBeInTheDocument()
    const confirm = within(form).getByRole("button", { name: "Move deals and remove" })
    expect(confirm).toBeDisabled()
    const target = within(form).getByRole("combobox", { name: "Move its deals to" })
    expect(within(target).queryByRole("option", { name: "Stage 1" })).toBeNull()
    fireEvent.change(target, { target: { value: id(102) } })
    await act(async () => fireEvent.click(confirm))
    expect(deleteFunnelStageAction).toHaveBeenCalledWith(id(101), id(102))
    expect(rows()).toHaveLength(1)
    expect(onChanged).toHaveBeenCalledWith({ type: "deleted", id: id(101), moveTo: id(102) })
  })

  it("does not let the last stage be removed", async () => {
    loadFunnelStageSettingsAction.mockResolvedValue(settings([s(1)]))
    renderIt()
    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(screen.getByRole("button", { name: "The funnel needs at least one stage." })).toBeDisabled()
    expect(screen.getAllByText("The funnel needs at least one stage.").length).toBeGreaterThan(0)
  })

  it("explains a 403 and turns that kind of change off", async () => {
    loadFunnelStageSettingsAction.mockResolvedValue(settings([s(1), s(2)]))
    deleteFunnelStageAction.mockResolvedValue(fail(403))
    createFunnelStageAction.mockResolvedValue(fail(403))
    renderIt()
    await waitFor(() => expect(rows()).toHaveLength(2))
    fireEvent.click(screen.getByRole("button", { name: "Remove the stage Stage 1" }))
    const form = screen.getByRole("form", { name: "Remove the stage Stage 1" })
    fireEvent.change(within(form).getByRole("combobox", { name: "Move its deals to" }), { target: { value: id(102) } })
    await act(async () => fireEvent.click(within(form).getByRole("button", { name: "Move deals and remove" })))
    expect(screen.getByRole("alert")).toHaveTextContent("You do not have permission to remove stages.")
    expect(rows()).toHaveLength(2)
    expect(screen.getByRole("button", { name: "Remove the stage Stage 2" })).toBeDisabled()
    expect(onChanged).not.toHaveBeenCalled()

    fireEvent.change(screen.getByRole("textbox", { name: "Stage name" }), { target: { value: "New" } })
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Add stage" })))
    expect(screen.getByRole("alert")).toHaveTextContent("You do not have permission to add stages.")
    expect(screen.getByRole("button", { name: "Add stage" })).toBeDisabled()
  })

  it("says so when the stages cannot be read (403) or fail to load (retry)", async () => {
    loadFunnelStageSettingsAction.mockResolvedValueOnce(fail(403))
    const { unmount } = renderIt()
    expect(await screen.findByRole("alert")).toHaveTextContent("You do not have permission to manage the funnel stages.")
    expect(screen.queryByRole("button", { name: "Add stage" })).toBeNull()
    unmount()

    loadFunnelStageSettingsAction.mockResolvedValueOnce(fail(500)).mockResolvedValueOnce(settings([s(1)]))
    renderIt()
    expect(await screen.findByText("We could not load the stages.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await waitFor(() => expect(rows()).toHaveLength(1))
  })
})
