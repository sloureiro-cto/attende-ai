import { act, fireEvent, render, screen } from "@testing-library/react"
import type { IProject } from "app/_types/Project"
import { emptyDraft } from "lib/automations/botBuilderState"
import type { EditorContextData } from "lib/automations/editorContext"
import type { AdvancedAutomationTrigger } from "lib/automations/types"
import { BotStartInspector } from "./BotStartInspector"
import type { BotLookups } from "./useBotLookups"

jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
jest.mock("hooks/useWorkspaceSettingsTranslation", () => ({
  useWorkspaceSettingsTranslation: () => ({ t: (k: string) => k, language: "english" }),
}))
jest.mock("context/WorkspaceContext", () => ({ useWorkspace: () => ({ selectedWorkspace: { members: [] } }) }))
jest.mock("components/settings/whatsapp-lite/template-rule-forms", () => ({
  waTemplateSelectInputTriggerClassNames: "",
  waTemplateSelectInputSmallTriggerClassNames: "",
  waTemplateSelectInputViewportClassNames: "",
  waTemplateSearchPopoverClassNames: "",
}))
jest.mock("actions/labels/createLabel", () => ({ createLabelAction: jest.fn() }))
jest.mock("components/Project/CardStructure/LabelsLayout", () => ({
  LabelEditorActions: () => null,
  LabelEditorHeader: () => null,
  LabelEditorPickers: () => null,
}))
jest.mock("components/Project/Automations/ProjectBoardColumnPicker", () => ({ ProjectBoardColumnPicker: () => <div data-testid="stage-picker" /> }))
const rotate = jest.fn()
jest.mock("actions/messaging-automations/advancedAutomations", () => ({
  rotateAdvancedAutomationWebhookSecretAction: (...a: unknown[]) => rotate(...a),
}))

const hex = (c: string) => c.repeat(24)
const project = { _id: hex("d"), title: "Vendas", tabs: [{ type: "board", boardId: hex("b"), title: "Funil" }] } as unknown as IProject
const ctx: EditorContextData = { workspaceId: hex("w"), sessions: { whatsapp: [], instagram: [], sms: [] }, agents: [], crmProjects: [project] }
const lookups = {
  users: { status: "ready", data: [] },
  labels: {},
  fields: {},
  projectColumns: {},
  loadUsers: jest.fn(),
  loadLabels: jest.fn(),
  loadFields: jest.fn(),
  loadProjectColumns: jest.fn(),
  addLabel: jest.fn(),
} as unknown as BotLookups

const renderStart = (trigger: AdvancedAutomationTrigger, id?: string) => {
  const dispatch = jest.fn()
  const draft = emptyDraft({ id, trigger, channels: [{ channel: "whatsapp", enabledSessionIds: ["s1"] }] })
  render(<BotStartInspector draft={draft} dispatch={dispatch} onClose={() => undefined} ctx={ctx} lookups={lookups} webhook={id ? { configured: false, path: `/api/automations/hooks/${id}` } : undefined} />)
  return dispatch
}

beforeEach(() => rotate.mockReset())

describe("BotStartInspector", () => {
  it("a CRM trigger shows its stage, the background hint, the filters and once per lead", () => {
    const dispatch = renderStart({ kind: "card_stage_changed", dedupeDays: 0 })
    expect(screen.getByText("Starts when a lead moves to this stage.")).toBeInTheDocument()
    expect(screen.getByText("These start in the background, usually within about a minute.")).toBeInTheDocument()
    expect(screen.getByText("Stage")).toBeInTheDocument()
    expect(screen.getByText("Filters")).toBeInTheDocument()
    // The conversation dedupe is a new-conversation setting only.
    expect(screen.queryByText("advancedAutomationFieldDedupe")).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("switch", { name: "Only once per lead" }))
    expect(dispatch).toHaveBeenCalledWith({ type: "meta", patch: { trigger: { kind: "card_stage_changed", dedupeDays: 0, oncePerLead: true } } })
  })

  it("a new automation must be saved before it has a webhook URL", () => {
    renderStart({ kind: "webhook", dedupeDays: 0 })
    expect(screen.getByText("Save the automation to get its webhook URL.")).toBeInTheDocument()
  })

  it("shows the webhook URL and the secret once, after generating it", async () => {
    rotate.mockResolvedValue({ success: true, data: { secret: "whsec_test_123", path: `/api/automations/hooks/${hex("a")}`, header: "X-Attende-Secret" } })
    renderStart({ kind: "webhook", dedupeDays: 0 }, hex("a"))
    expect(screen.getByText(`http://localhost/api/automations/hooks/${hex("a")}`)).toBeInTheDocument()
    expect(screen.getByText("No secret yet: calls are refused until you generate one.")).toBeInTheDocument()
    expect(screen.queryByTestId("webhook-secret")).not.toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Generate secret" }))
    })
    expect(rotate).toHaveBeenCalledWith(hex("a"))
    expect(screen.getByTestId("webhook-secret")).toHaveTextContent("whsec_test_123")
    expect(screen.getByText("Copy it now: this secret will not be shown again.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Rotate secret" })).toBeInTheDocument()
  })
})
