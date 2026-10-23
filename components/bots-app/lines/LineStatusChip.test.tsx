import { render, screen } from "@testing-library/react"
import type { BotsLineStatus } from "lib/bots-app/lines"
import { LineStatusChip } from "./LineStatusChip"

describe("LineStatusChip", () => {
  it.each<[BotsLineStatus, string]>([
    ["connected", "Connected"],
    ["reconnecting", "Reconnecting"],
    ["qr_pending", "Waiting for QR scan"],
    ["disconnected", "Disconnected"],
    ["error", "Blocked"],
    ["pending_setup", "Setup pending"],
    ["disabled", "Disabled"],
  ])("renders %s with its label and a state hook for styling/tests", (status, label) => {
    render(<LineStatusChip status={status} label={label} />)
    const chip = screen.getByText(label)
    expect(chip).toHaveAttribute("data-status", status)
  })
})
