import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { ConnectChooser, type ConnectMethod } from "./ConnectChooser"

jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))

function Harness({ onContinue = jest.fn(), onCancel = jest.fn(), busy = false }: { onContinue?: jest.Mock; onCancel?: jest.Mock; busy?: boolean }) {
  const [name, setName] = useState("")
  const [method, setMethod] = useState<ConnectMethod>("qr")
  const [sync, setSync] = useState(false)
  return (
    <>
      <ConnectChooser
        name={name}
        onNameChange={setName}
        method={method}
        onMethodChange={setMethod}
        syncHistory={sync}
        onSyncHistoryChange={setSync}
        busy={busy}
        onContinue={onContinue}
        onCancel={onCancel}
      />
      <output data-testid="state">{`${method}|${sync}`}</output>
    </>
  )
}

describe("ConnectChooser", () => {
  it("offers both ways to connect as a radio group, each with its one-line explanation", () => {
    render(<Harness />)
    const group = screen.getByRole("group", { name: "How do you want to connect?" })
    expect(group).toBeInTheDocument()
    const qr = screen.getByRole("radio", { name: /Scan a QR code/ })
    const cloud = screen.getByRole("radio", { name: /Official Meta API/ })
    expect(qr).toBeChecked()
    expect(qr).toHaveAccessibleDescription(/uses|links the WhatsApp app on your phone/)
    expect(cloud).toHaveAccessibleDescription(/templates and for writing after the 24-hour window/)
  })

  it("requires a display name before continuing and points the user at the field", () => {
    const onContinue = jest.fn()
    render(<Harness onContinue={onContinue} />)
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(onContinue).not.toHaveBeenCalled()
    const input = screen.getByRole("textbox", { name: /Display name/ })
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(input).toHaveFocus()
    expect(screen.getByText("Enter a display name to continue.")).toBeInTheDocument()

    fireEvent.change(input, { target: { value: "  " } })
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(onContinue).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { value: "Sales" } })
    expect(input).not.toHaveAttribute("aria-invalid")
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it("shows the history sync switch only for the QR code option", () => {
    render(<Harness />)
    const sync = screen.getByRole("switch", { name: "Import past conversations" })
    expect(sync).toHaveAttribute("aria-checked", "false")
    fireEvent.click(sync)
    expect(sync).toHaveAttribute("aria-checked", "true")
    expect(screen.getByTestId("state")).toHaveTextContent("qr|true")

    fireEvent.click(screen.getByRole("radio", { name: /Official Meta API/ }))
    expect(screen.getByTestId("state")).toHaveTextContent("cloud|true")
    expect(screen.queryByRole("switch", { name: "Import past conversations" })).not.toBeInTheDocument()
  })

  it("cancels, and blocks a second submit while the QR session is being created", () => {
    const onCancel = jest.fn()
    const onContinue = jest.fn()
    render(<Harness onCancel={onCancel} onContinue={onContinue} busy />)
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled()
  })
})
