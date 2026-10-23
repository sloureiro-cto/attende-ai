import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { WindowClosedComposer } from "./WindowClosedComposer"

jest.mock("app/utils/showToast", () => ({ showToast: jest.fn() }))
jest.mock("actions/whatsapp-lite/sessions", () => ({
  getWhatsAppSessionAction: jest.fn(async () => ({ success: true, data: { cloudApiConfig: { wabaId: "waba1" } } })),
}))
jest.mock("actions/whatsapp-lite/cloudTemplates", () => ({ listCloudTemplatesAction: jest.fn() }))
jest.mock("actions/whatsapp-lite/conversations", () => ({ sendWhatsAppTemplateAction: jest.fn() }))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { listCloudTemplatesAction } = require("actions/whatsapp-lite/cloudTemplates") as { listCloudTemplatesAction: jest.Mock }
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { sendWhatsAppTemplateAction } = require("actions/whatsapp-lite/conversations") as { sendWhatsAppTemplateAction: jest.Mock }

const t = ((key: string, vars?: Record<string, string>) => (vars ? `${key}:${Object.values(vars).join(",")}` : key)) as never

const template = (over: Record<string, unknown> = {}) => ({
  _id: "tpl1",
  wabaId: "waba1",
  name: "follow_up",
  language: "pt_BR",
  category: "UTILITY",
  status: "APPROVED",
  components: [{ type: "BODY", text: "Oi {{1}}, podemos continuar?" }],
  ...over,
})

beforeEach(() => jest.clearAllMocks())

describe("WindowClosedComposer", () => {
  it("explains the closed window and only loads templates when asked", () => {
    render(<WindowClosedComposer sessionId="s1" conversationId="c1" t={t} onSent={jest.fn()} />)
    expect(screen.getByText("windowClosedTitle")).toBeInTheDocument()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    expect(listCloudTemplatesAction).not.toHaveBeenCalled()
  })

  it("sends an approved template with its values and refreshes the thread", async () => {
    listCloudTemplatesAction.mockResolvedValue({ success: true, data: [template(), template({ _id: "tpl2", name: "pending", status: "PENDING" })] })
    sendWhatsAppTemplateAction.mockResolvedValue({ success: true, data: { _id: "m1" } })
    const onSent = jest.fn()
    render(<WindowClosedComposer sessionId="s1" conversationId="c1" t={t} onSent={onSent} />)
    fireEvent.click(screen.getByRole("button", { name: "windowChooseTemplate" }))
    const select = await screen.findByRole("combobox")
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["windowTemplatePlaceholder", "follow_up · pt_BR"])
    fireEvent.change(select, { target: { value: "tpl1" } })
    fireEvent.change(screen.getByLabelText("windowTemplateVar:1"), { target: { value: "Ana" } })
    expect(screen.getByText("Oi Ana, podemos continuar?")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "send" }))
    await waitFor(() => expect(onSent).toHaveBeenCalled())
    expect(sendWhatsAppTemplateAction).toHaveBeenCalledWith(
      "s1",
      "c1",
      expect.objectContaining({ templateName: "follow_up", language: "pt_BR", components: [{ type: "body", parameters: [{ type: "text", text: "Ana" }] }] })
    )
  })

  it("says so when the line has no approved template", async () => {
    listCloudTemplatesAction.mockResolvedValue({ success: true, data: [] })
    render(<WindowClosedComposer sessionId="s1" conversationId="c1" t={t} onSent={jest.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "windowChooseTemplate" }))
    expect(await screen.findByText("windowTemplatesNone")).toBeInTheDocument()
  })
})
