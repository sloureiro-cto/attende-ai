import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import type { ICardFieldDefinition } from "actions/projects/cardFieldDefinitions"
import type { IProject } from "app/_types/Project"
import { useAutomationsT } from "components/automations/ui/useAutomationsT"
import { CardFieldPicker, type FieldOption, fieldOptions, FieldValueInput, STANDARD_FIELDS } from "./CardFieldPicker"
import { useBotLookups } from "../useBotLookups"

jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
jest.mock("hooks/useWorkspaceSettingsTranslation", () => ({
  useWorkspaceSettingsTranslation: () => ({ t: (k: string) => k, language: "english" }),
}))
jest.mock("context/WorkspaceContext", () => ({
  useWorkspace: () => ({ selectedWorkspace: { members: [{ _id: "u".repeat(24), name: "Bia Lima", email: "bia@example.com" }] } }),
}))
const getFields = jest.fn()
jest.mock("actions/projects/cardFieldDefinitions", () => ({ getCardFieldDefinitionsAction: (...a: unknown[]) => getFields(...a) }))
jest.mock("actions/attende/agents", () => ({ listAttendeAgentsAction: jest.fn() }))
jest.mock("actions/labels/getLabels", () => ({ getLabelsAction: jest.fn() }))
jest.mock("actions/messaging-automations/advancedAutomations", () => ({ listAdvancedAutomationsAction: jest.fn() }))
jest.mock("actions/roles/getWorkspaceRoles", () => ({ getWorkspaceRoles: jest.fn() }))
jest.mock("actions/users/getUsersFromWorkspace", () => ({ getUsersFromWorkspace: jest.fn() }))
jest.mock("actions/whatsapp-lite/cloudTemplates", () => ({ listCloudTemplatesAction: jest.fn() }))
// The shared rule-form module drags the auth stack in; only its class names are used here.
jest.mock("components/settings/whatsapp-lite/template-rule-forms", () => ({
  waTemplateSelectInputTriggerClassNames: "",
  waTemplateSelectInputSmallTriggerClassNames: "",
  waTemplateSelectInputViewportClassNames: "",
  waTemplateSearchPopoverClassNames: "",
}))
jest.mock("lib/projects/fetchProjectColumns", () => ({ fetchAutomationBoardColumns: jest.fn() }))

// Radix Select needs these in jsdom.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => undefined
  Element.prototype.scrollIntoView = () => undefined
})
beforeEach(() => getFields.mockReset())

const BOARD_PLACEHOLDER = "Select board"
const P = "p".repeat(24)
const B1 = "1".repeat(24)
const B2 = "2".repeat(24)
const project = {
  _id: P,
  title: "Vendas",
  tabs: [
    { type: "board", boardId: B1, title: "Funil" },
    { type: "board", boardId: B2, title: "Pós-venda" },
  ],
} as unknown as IProject

const def = (over: Partial<ICardFieldDefinition>): ICardFieldDefinition =>
  ({ _id: over.fieldId, cardLayout: "l", kind: "field", displayZone: "sidebar", width: "full", order: 0, source: "manual", isDefault: false, createdAt: "", updatedAt: "", ...over }) as ICardFieldDefinition

const DEFS = [
  def({ fieldId: "plano", fieldName: "Plano", fieldType: "select", options: ["Básico", "Pro"] }),
  def({ fieldId: "renovacao", fieldName: "Renovação", fieldType: "date" }),
  def({ fieldId: "assentos", fieldName: "Assentos", fieldType: "number" }),
  def({ fieldId: "ativo", fieldName: "Ativo", fieldType: "boolean" }),
  def({ fieldId: "contrato", fieldName: "Contrato", fieldType: "file" }),
  def({ fieldId: "abrir", fieldName: "Abrir", fieldType: "button", kind: "button" }),
  // Same id as a standard field: listed once, as the standard one.
  def({ fieldId: "email", fieldName: "E-mail", fieldType: "email" }),
]

function Harness({ initial }: { initial: { projectId?: string; boardId?: string; fieldId: string } }) {
  const lookups = useBotLookups("w".repeat(24))
  const { t } = useAutomationsT()
  const [value, setValue] = useState(initial)
  const [field, setField] = useState<FieldOption | undefined>()
  return (
    <>
      <CardFieldPicker value={value} onChange={setValue} onField={setField} projects={[project]} lookups={lookups} t={t} />
      <p data-testid="picked">{value.fieldId}</p>
      {value.fieldId ? <FieldValueInput field={field} value="" onChange={() => undefined} lookups={lookups} t={t} label="Value" /> : null}
    </>
  )
}

const openSelect = (name: RegExp | string) => {
  const trigger = screen.getAllByRole("combobox").find((el) => (typeof name === "string" ? el.textContent?.includes(name) : name.test(el.textContent ?? "")))!
  fireEvent.keyDown(trigger, { key: "Enter" })
}

describe("CardFieldPicker", () => {
  it("lists standard fields first, then the board's value fields (no files, buttons or duplicates)", () => {
    const list = fieldOptions(DEFS)
    expect(list.slice(0, STANDARD_FIELDS.length).map((f) => f.fieldId)).toEqual(STANDARD_FIELDS.map((f) => f.fieldId))
    expect(list.filter((f) => !f.standard).map((f) => [f.fieldId, f.type])).toEqual([
      ["plano", "select"],
      ["renovacao", "date"],
      ["assentos", "number"],
      ["ativo", "boolean"],
    ])
    expect(fieldOptions([], { includeOwner: false }).some((f) => f.fieldId === "card:owner")).toBe(false)
  })

  it("loads the fields of the chosen board and lets the author pick a custom field", async () => {
    getFields.mockResolvedValue({ success: true, data: DEFS })
    render(<Harness initial={{ projectId: P, fieldId: "" }} />)
    // Two boards: nothing loads until one is chosen.
    expect(getFields).not.toHaveBeenCalled()
    openSelect(BOARD_PLACEHOLDER)
    await act(async () => {
      fireEvent.click(await screen.findByRole("option", { name: "Pós-venda" }))
    })
    await waitFor(() => expect(getFields).toHaveBeenCalledWith({ projectId: P, boardId: B2 }))
    await screen.findByText("Select a field")
    openSelect("Select a field")
    expect(await screen.findByRole("option", { name: /Lead name \(title\)/ })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: /Value/ })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: /Contrato/ })).not.toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole("option", { name: /Renovação/ }))
    })
    expect(screen.getByTestId("picked")).toHaveTextContent("renovacao")
    // A date field gets a date input.
    expect(screen.getByLabelText("Value")).toHaveAttribute("type", "date")
  })

  it("shows an error with a retry that loads the fields again", async () => {
    getFields.mockResolvedValueOnce({ success: false, error: "boom" }).mockResolvedValueOnce({ success: true, data: DEFS })
    render(<Harness initial={{ projectId: P, boardId: B1, fieldId: "" }} />)
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the fields of this board.")
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    })
    await screen.findByText("Select a field")
    expect(getFields).toHaveBeenCalledTimes(2)
  })
})

describe("FieldValueInput", () => {
  function Value({ field }: { field: FieldOption }) {
    const lookups = useBotLookups("w".repeat(24))
    const { t } = useAutomationsT()
    return <FieldValueInput field={field} value="" onChange={() => undefined} lookups={lookups} t={t} label="Value" />
  }

  it("follows the field type", async () => {
    const { unmount } = render(<Value field={{ fieldId: "assentos", type: "currency", standard: false }} />)
    expect(screen.getByLabelText("Value")).toHaveAttribute("inputmode", "decimal")
    unmount()

    const select = render(<Value field={{ fieldId: "plano", type: "select", options: ["Básico", "Pro"], standard: false }} />)
    openSelect("Choose a value")
    expect(await screen.findByRole("option", { name: "Básico" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: /\{\{answer\}\}/ })).toBeInTheDocument()
    select.unmount()

    render(<Value field={{ fieldId: "ativo", type: "boolean", standard: false }} />)
    openSelect("Choose a value")
    expect(await screen.findByRole("option", { name: "Yes" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "No" })).toBeInTheDocument()
  })
})
