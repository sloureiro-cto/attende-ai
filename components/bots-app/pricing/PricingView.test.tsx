import { render, screen, within } from "@testing-library/react"
import { PricingView } from "./PricingView"

let language: "english" | "portuguese" | "spanish" = "english"
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: language }) }))
jest.mock("next/image", () => ({ __esModule: true, default: (props: { alt: string }) => <span role="img" aria-label={props.alt} /> }))

beforeEach(() => {
  language = "english"
})

describe("PricingView without prices", () => {
  it("renders the three tiers with their limits and a 'price at checkout' note instead of a number", () => {
    render(<PricingView />)
    for (const name of ["Starter", "Growth", "Scale"]) expect(screen.getByRole("heading", { name })).toBeInTheDocument()
    expect(screen.getAllByText("Price shown at checkout")).toHaveLength(3)
    const growth = document.querySelector('[data-tier="growth"]') as HTMLElement
    expect(within(growth).getByText("3 WhatsApp / social lines")).toBeInTheDocument()
    expect(within(growth).getByText("3 AI agents")).toBeInTheDocument()
    expect(within(growth).getByText("5,000 AI replies per month")).toBeInTheDocument()
    expect(within(growth).getByText("5 team seats")).toBeInTheDocument()
    expect(within(growth).getByText("100 knowledge documents")).toBeInTheDocument()
    const starter = document.querySelector('[data-tier="starter"]') as HTMLElement
    expect(within(starter).getByText("1 WhatsApp / social line")).toBeInTheDocument()
    expect(within(starter).getByText("1 AI agent")).toBeInTheDocument()
    expect(within(starter).getByText("20 knowledge documents")).toBeInTheDocument()
  })

  it("never invents a price", () => {
    render(<PricingView />)
    expect(document.body.textContent).not.toMatch(/R\$|\$\s?\d|€/)
    expect(screen.queryByText("/ month")).not.toBeInTheDocument()
  })

  it("highlights the 7-day trial and links every tier to signup with its plan", () => {
    render(<PricingView />)
    expect(screen.getByText("7-day free trial")).toBeInTheDocument()
    const links = screen.getAllByRole("link", { name: "Start 7-day free trial" })
    expect(links.map((l) => l.getAttribute("href"))).toEqual(expect.arrayContaining(["/signup?plan=starter", "/signup?plan=growth", "/signup?plan=scale", "/signup"]))
  })

  it("marks the most popular tier", () => {
    render(<PricingView />)
    const growth = document.querySelector('[data-tier="growth"]') as HTMLElement
    expect(within(growth).getByText("Most popular")).toBeInTheDocument()
    expect(screen.getAllByText("Most popular")).toHaveLength(1)
  })

  it("offers the booking CTA and the FAQ", () => {
    render(<PricingView />)
    expect(screen.getByRole("link", { name: "Book a demo or training" })).toHaveAttribute("href", "https://app.jsynq.com/book/uUcE1FEPp94")
    expect(screen.getByRole("heading", { name: "Questions, answered" })).toBeInTheDocument()
    expect(screen.getByText("How does the free trial work?")).toBeInTheDocument()
    expect(document.querySelectorAll("details")).toHaveLength(5)
  })

  it("links to sign in", () => {
    render(<PricingView />)
    expect(screen.getAllByRole("link", { name: "Sign in" })[0]).toHaveAttribute("href", "/login")
  })
})

describe("PricingView with prices", () => {
  it("shows a formatted price only for the tiers that have one", () => {
    render(<PricingView plans={[{ slug: "attende_starter", tier: "starter", name: "Starter", limits: {}, prices: [{ currency: "usd", interval: "month", amount: 19700 }] }]} />)
    const starter = screen.getByTestId("price-starter")
    expect(starter.textContent).toMatch(/197/)
    expect(starter.textContent).toContain("/ month")
    expect(within(screen.getByTestId("price-growth")).getByText("Price shown at checkout")).toBeInTheDocument()
  })
})

describe("PricingView languages", () => {
  it("renders in Portuguese and Spanish", () => {
    language = "portuguese"
    const { unmount } = render(<PricingView />)
    expect(screen.getByText("7 dias grátis para testar")).toBeInTheDocument()
    expect(screen.getByText("5.000 respostas de IA por mês")).toBeInTheDocument()
    unmount()
    language = "spanish"
    render(<PricingView />)
    expect(screen.getByText("7 días de prueba gratis")).toBeInTheDocument()
  })
})
