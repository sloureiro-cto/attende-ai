import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import {
  createCloudApiWhatsAppSessionAction,
  createWhatsAppSessionAction,
  getWhatsAppSessionAction,
  getWhatsAppSessionQrAction,
} from "actions/whatsapp-lite"
import type { WhatsAppSession } from "actions/whatsapp-lite/types"
import { ConnectWhatsAppDialog } from "./ConnectWhatsAppDialog"

jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
jest.mock("app/utils/showToast", () => ({ showToast: jest.fn() }))
jest.mock("@statsig/react-bindings", () => ({ useGateValue: () => false }))
jest.mock("next-auth/react", () => ({ useSession: () => ({ data: null }) }))
jest.mock("next/image", () => ({ __esModule: true, default: () => null }))
jest.mock("@/lib/whatsapp-lite/loadFacebookSdk", () => ({ launchWhatsAppEmbeddedSignup: jest.fn(), loadFacebookSdk: jest.fn() }))
jest.mock("actions/whatsapp-lite", () => ({
  createCloudApiWhatsAppSessionAction: jest.fn(),
  createEmbeddedSignupCloudApiSessionAction: jest.fn(),
  createWhatsAppSessionAction: jest.fn(),
  getWhatsAppCloudConnectOptionsAction: jest.fn().mockResolvedValue({ success: true, data: { hasWorkspaceMetaAppOverride: false } }),
  getWhatsAppSessionAction: jest.fn(),
  getWhatsAppSessionQrAction: jest.fn(),
  updateWhatsAppSessionAction: jest.fn(),
}))

const session: WhatsAppSession = { _id: "s1", label: "Sales", status: "qr_pending", transport: "baileys" }

beforeEach(() => jest.clearAllMocks())

describe("ConnectWhatsAppDialog", () => {
  it("uses the Attende-ai copy, with no JSYNQ branding", () => {
    render(<ConnectWhatsAppDialog open onOpenChange={jest.fn()} onSessionUpsert={jest.fn()} workspaceName="Acme" />)
    const dialog = screen.getByRole("dialog", { name: "Connect a WhatsApp number" })
    expect(dialog).toHaveTextContent("Attende-ai answers the customers who message this number.")
    expect(dialog.textContent).not.toMatch(/jsynq/i)
    expect(dialog.querySelector("img[src*='jsynq']")).toBeNull()
  })

  it("creates a QR session with the name and history choice, then shows the code", async () => {
    ;(createWhatsAppSessionAction as jest.Mock).mockResolvedValue({ success: true, data: session })
    ;(getWhatsAppSessionAction as jest.Mock).mockResolvedValue({ success: true, data: session })
    ;(getWhatsAppSessionQrAction as jest.Mock).mockResolvedValue({ success: true, data: { status: "qr_pending", qrReady: true, qrCode: "data:image/png;base64,AAA" } })
    const onSessionUpsert = jest.fn()
    render(<ConnectWhatsAppDialog open onOpenChange={jest.fn()} onSessionUpsert={onSessionUpsert} workspaceName="Acme" />)

    fireEvent.change(screen.getByRole("textbox", { name: /Display name/ }), { target: { value: " Sales " } })
    fireEvent.click(screen.getByRole("switch", { name: "Import past conversations" }))
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))

    await waitFor(() => expect(createWhatsAppSessionAction).toHaveBeenCalledWith({ label: "Sales", syncHistory: true }))
    expect(onSessionUpsert).toHaveBeenCalledWith(session)
    expect(await screen.findByRole("img", { name: "QR code to link WhatsApp" })).toHaveAttribute("src", "data:image/png;base64,AAA")
    expect(screen.getByRole("dialog", { name: "Scan the code with your phone" })).toBeInTheDocument()
  })

  it("takes the official API path to the credentials form and back", async () => {
    ;(createCloudApiWhatsAppSessionAction as jest.Mock).mockResolvedValue({ success: true, data: { ...session, status: "connected" } })
    render(<ConnectWhatsAppDialog open onOpenChange={jest.fn()} onSessionUpsert={jest.fn()} workspaceName="Acme" />)
    fireEvent.change(screen.getByRole("textbox", { name: /Display name/ }), { target: { value: "Support" } })
    fireEvent.click(screen.getByRole("radio", { name: /Official Meta API/ }))
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))

    const dialog = screen.getByRole("dialog", { name: "Connect with the official Meta API" })
    const submit = within(dialog).getByRole("button", { name: "Connect number" })
    expect(submit).toBeDisabled()
    fireEvent.change(within(dialog).getByLabelText("WhatsApp Business Account ID"), { target: { value: "111" } })
    fireEvent.change(within(dialog).getByLabelText("Phone number ID"), { target: { value: "222" } })
    fireEvent.change(within(dialog).getByLabelText("Access token"), { target: { value: "EAAG" } })
    expect(submit).toBeEnabled()
    fireEvent.click(submit)
    await waitFor(() =>
      expect(createCloudApiWhatsAppSessionAction).toHaveBeenCalledWith({
        label: "Support",
        credentials: { wabaId: "111", phoneNumberId: "222", accessToken: "EAAG", pin: "" },
      })
    )
    expect(await screen.findByRole("dialog", { name: "Sales is connected" })).toBeInTheDocument()
  })

  it("resumes on the QR step for a reconnect", () => {
    ;(getWhatsAppSessionAction as jest.Mock).mockResolvedValue({ success: false })
    ;(getWhatsAppSessionQrAction as jest.Mock).mockResolvedValue({ success: false })
    render(<ConnectWhatsAppDialog open initialSession={session} onOpenChange={jest.fn()} onSessionUpsert={jest.fn()} workspaceName="Acme" />)
    expect(screen.getByRole("dialog", { name: "Scan the code with your phone" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "New code" })).toBeInTheDocument()
  })
})
