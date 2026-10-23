import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AccountMenu } from "./AccountMenu"

const setUserLanguage = jest.fn()
jest.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { name: "Ana Souza", email: "ana@x.co" } } }), signOut: jest.fn() }))
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "portuguese", setUserLanguage }) }))

describe("AccountMenu language picker", () => {
  it("lists the languages by their own names, marks the current one and saves a choice", async () => {
    const user = userEvent.setup()
    render(<AccountMenu />)
    await user.click(screen.getByRole("button", { name: /conta|account/i }))
    expect(await screen.findByText("Idioma")).toBeInTheDocument()
    expect(screen.getByRole("menuitemradio", { name: "Português (Brasil)" })).toHaveAttribute("aria-checked", "true")
    await user.click(screen.getByRole("menuitemradio", { name: "English" }))
    expect(setUserLanguage).toHaveBeenCalledWith("english")
  })
})
