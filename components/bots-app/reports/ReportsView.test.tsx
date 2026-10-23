import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { emptyOverview, kpi, overview } from "lib/attende/reports/fixtures"
import type { OverviewResponse, ReportFilters } from "lib/attende/reports/types"
import { ReportsView } from "./ReportsView"

let mockLanguage = "english"
jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: mockLanguage }) }))
// The real select is a Radix listbox; a native one keeps the test about our logic.
jest.mock("components/automations/bot/BotSelect", () => ({
  BotSelect: ({ items, value, onValueChange, ...rest }: { items: Array<{ value: string; displayName: string }>; value: string; onValueChange: (v: string) => void }) => (
    <select aria-label={(rest as { "aria-label"?: string })["aria-label"]} value={value} onChange={(e) => onValueChange(e.target.value)}>
      {items.map((i) => (
        <option key={i.value} value={i.value}>
          {i.displayName}
        </option>
      ))}
    </select>
  ),
}))

const loadReportAction = jest.fn()
jest.mock("actions/attende/reports", () => ({ loadReportAction: (...a: unknown[]) => loadReportAction(...a) }))

const FILTERS: ReportFilters = { from: "2026-09-23", to: "2026-10-22", channel: null, agentId: null }
const ok = (o: OverviewResponse) => ({ success: true as const, data: { overview: o, agents: o.byAgent } })
const initial = (o: OverviewResponse | null, error: { success: false; status: number; reference?: string } | null = null, filters = FILTERS) => ({
  filters,
  preset: 30 as const,
  data: o ? { overview: o, agents: o.byAgent } : null,
  error,
})

beforeEach(() => {
  mockLanguage = "english"
  loadReportAction.mockReset()
  window.history.replaceState(null, "", "/reports")
})

describe("ReportsView numbers", () => {
  it("shows the headline KPIs with the change versus the previous period", () => {
    render(<ReportsView initial={initial(overview())} />)
    const conversations = screen.getByTestId("kpi-conversations")
    expect(within(conversations).getByText("120")).toBeInTheDocument()
    expect(within(conversations).getByText("20% more")).toBeInTheDocument()
    const handoff = screen.getByTestId("kpi-handoffRate")
    expect(within(handoff).getByText("20%")).toBeInTheDocument()
    expect(within(handoff).getByText("10 pts lower")).toBeInTheDocument()
  })

  it("marks proxy metrics as estimates and shows the exact definition on demand", async () => {
    render(<ReportsView initial={initial(overview())} />)
    const tile = screen.getByTestId("kpi-aiResolutionRate")
    expect(within(tile).getByText("Estimate")).toBeInTheDocument()
    expect(within(screen.getByTestId("kpi-conversations")).queryByText("Estimate")).toBeNull()
    fireEvent.click(within(tile).getByRole("button", { name: /What does Possibly resolved by AI mean/ }))
    expect(await screen.findByText(/It does not mean the customer was satisfied/)).toBeInTheDocument()
  })

  it("never turns a missing number into 0", () => {
    const o = overview()
    o.kpis = { ...o.kpis, firstResponseAiMedianMs: kpi(null, null), aiResolutionRate: kpi(null, null) }
    render(<ReportsView initial={initial(o)} />)
    expect(within(screen.getByTestId("kpi-firstResponseAiMedianMs")).getByText("No data")).toBeInTheDocument()
    expect(within(screen.getByTestId("kpi-aiResolutionRate")).getByText("No data")).toBeInTheDocument()
    expect(within(screen.getByTestId("kpi-aiResolutionRate")).queryByText("0%")).toBeNull()
  })

  it("says the metric was 0 before instead of inventing a percentage", () => {
    const o = overview()
    o.kpis = { ...o.kpis, conversations: kpi(8, 0) }
    render(<ReportsView initial={initial(o)} />)
    const tile = screen.getByTestId("kpi-conversations")
    expect(within(tile).getByText(/^Was 0 in Sep 24/)).toBeInTheDocument()
    expect(within(tile).queryByText(/% more/)).toBeNull()
  })

  it("shows no change at all when the previous period has no data", () => {
    const o = overview()
    o.kpis = { ...o.kpis, conversations: kpi(120, 0), aiReplies: kpi(400, 0), humanReplies: kpi(60, 0), automationReplies: kpi(30, 0) }
    render(<ReportsView initial={initial(o)} />)
    // handoffRate still has a "previous" value in the fixture, but the previous window had no activity: no chip.
    const handoff = screen.getByTestId("kpi-handoffRate")
    expect(within(handoff).queryByText(/pts lower/)).toBeNull()
    expect(within(handoff).getByText(/^No data for Sep 24/)).toBeInTheDocument()
    expect(screen.queryByText(/points higher than in the previous period/)).toBeNull()
  })

  it("says what each rate is measured on, with numerator and denominator", () => {
    render(<ReportsView initial={initial(overview())} />)
    expect(within(screen.getByTestId("kpi-basis-handoffRate")).getByText(/^24 of 120 conversations started Oct 1/)).toBeInTheDocument()
    const resolution = screen.getByTestId("kpi-basis-aiResolutionRate")
    expect(within(resolution).getByText(/^60 of 102 settled conversations started/)).toBeInTheDocument()
    expect(within(resolution).getByText("18 conversations still open are not counted")).toBeInTheDocument()
    expect(within(screen.getByTestId("kpi-basis-leadsCreated")).getByText(/^25 of 120 conversations started/)).toBeInTheDocument()
    expect(within(screen.getByTestId("kpi-basis-conversations")).getByText(/^Started Oct 1/)).toBeInTheDocument()
  })

  it("never colours the AI-resolution proxy or the leads as good news", () => {
    render(<ReportsView initial={initial(overview())} />)
    const chip = within(screen.getByTestId("kpi-aiResolutionRate")).getByText("15 pts higher")
    expect(chip.className).toContain("bg-info-clean")
    expect(chip.className).not.toContain("success")
  })

  it("shows the period, the comparison window and the freshness in the page bar", () => {
    render(<ReportsView initial={initial(overview())} />)
    const bar = screen.getByTestId("report-period")
    expect(bar).toHaveTextContent(/Period: Oct 1\s–\s7, 2026 \(UTC days\)/)
    expect(bar).toHaveTextContent(/Compared with Sep 24\s–\s30/)
    expect(bar).toHaveTextContent(/Data refreshed every 10 minutes · fetched at/)
    expect(bar.closest("header")).not.toBeNull()
  })

  it("writes everything in Brazilian Portuguese with the locale's numbers", () => {
    mockLanguage = "portuguese"
    render(<ReportsView initial={initial(overview())} />)
    expect(screen.getByTestId("report-period")).toHaveTextContent(/Período: 1\s–\s7 de out\. de 2026 \(dias em UTC\)/)
    expect(within(screen.getByTestId("kpi-basis-handoffRate")).getByText(/^24 de 120 conversas iniciadas em 1/)).toBeInTheDocument()
    expect(within(screen.getByTestId("kpi-aiResolutionRate")).getByText("Possivelmente resolvidas pela IA")).toBeInTheDocument()
    expect(within(screen.getByTestId("kpi-aiResolutionRate")).getByText("55%")).toBeInTheDocument()
    expect(within(screen.getByTestId("agents-table")).getByText("Sem agente de IA")).toBeInTheDocument()
    expect(within(screen.getByTestId("handoff-reasons")).getByText("9 vezes")).toBeInTheDocument()
  })

  it("uses the singular when there is one", () => {
    render(<ReportsView initial={initial(overview({ topHandoffReasons: [{ reason: "price", count: 1 }] }))} />)
    expect(within(screen.getByTestId("handoff-reasons")).getByText("1 time")).toBeInTheDocument()
  })

  it("hides metrics the backend cannot measure and explains the gap", () => {
    render(<ReportsView initial={initial(overview())} />)
    expect(screen.queryByTestId("kpi-afterHoursShare")).toBeNull()
    const gap = screen.getByTestId("not-measured")
    expect(within(gap).getByText("Customer satisfaction score")).toBeInTheDocument()
    expect(within(gap).getByText("Customers who asked to stop receiving messages")).toBeInTheDocument()
    expect(within(gap).getByText(/set your business hours/)).toBeInTheDocument()
    expect(within(gap).getByText(/Sales or revenue generated by the AI/)).toBeInTheDocument()
  })

  it("shows the after-hours tile once business hours exist", () => {
    const o = overview()
    o.notAvailable = ["opt_outs"]
    o.kpis = { ...o.kpis, afterHoursShare: kpi(0.25, 0.2) }
    render(<ReportsView initial={initial(o)} />)
    expect(within(screen.getByTestId("kpi-afterHoursShare")).getByText("25%")).toBeInTheDocument()
  })

  it("lists agents, with the unattributed bucket named for what it is", () => {
    render(<ReportsView initial={initial(overview())} />)
    const table = screen.getByTestId("agents-table")
    expect(within(table).getByText("Sofia")).toBeInTheDocument()
    expect(within(table).getByText("No AI agent")).toBeInTheDocument()
    // the handoff share carries its numerator and denominator
    expect(within(table).getByText("(12 of 80 conversations)", { exact: false })).toBeInTheDocument()
    // a missing rate reads "No data", never 0
    expect(within(table).getAllByText("No data").length).toBeGreaterThan(0)
  })

  it("renders free-text handoff reasons as text, never as markup", () => {
    const o = overview({ topHandoffReasons: [{ reason: '<img src=x onerror="alert(1)">', count: 4 }] })
    render(<ReportsView initial={initial(o)} />)
    expect(screen.getByText('<img src=x onerror="alert(1)">')).toBeInTheDocument()
    expect(document.querySelector("img")).toBeNull()
  })

  it("reads the numbers back as plain-language insights", () => {
    render(<ReportsView initial={initial(overview())} />)
    expect(within(screen.getByTestId("insights")).getByText(/Possible AI resolution is 15 points higher/)).toBeInTheDocument()
  })
})

describe("ReportsView chart", () => {
  it("is a labelled image with a table alternative holding the same numbers", () => {
    render(<ReportsView initial={initial(overview())} />)
    const chart = screen.getByTestId("activity-chart")
    expect(within(chart).getByRole("img", { name: "Activity per day" })).toBeInTheDocument()
    fireEvent.click(within(chart).getByRole("button", { name: "Table" }))
    const rows = within(chart).getAllByRole("row")
    expect(rows).toHaveLength(1 + overview().series.length)
    expect(within(chart).getByRole("columnheader", { name: "Handoffs that day" })).toBeInTheDocument()
  })

  it("lets keyboard users step through the days", () => {
    render(<ReportsView initial={initial(overview())} />)
    const group = within(screen.getByTestId("activity-chart")).getByRole("group", { name: /Daily activity chart/ })
    fireEvent.keyDown(group, { key: "ArrowRight" })
    expect(within(screen.getByTestId("activity-chart")).getByRole("status")).toHaveTextContent("Oct 1")
    fireEvent.keyDown(group, { key: "ArrowRight" })
    expect(within(screen.getByTestId("activity-chart")).getByRole("status")).toHaveTextContent("Oct 2")
    fireEvent.keyDown(group, { key: "End" })
    expect(within(screen.getByTestId("activity-chart")).getByRole("status")).toHaveTextContent("Oct 3")
    fireEvent.keyDown(group, { key: "Escape" })
    expect(within(screen.getByTestId("activity-chart")).queryByRole("status")).toBeNull()
  })
})

describe("ReportsView states", () => {
  it("explains an empty period without claiming lines are missing", () => {
    render(<ReportsView initial={initial(emptyOverview())} />)
    expect(screen.getByText("No numbers for this period yet")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open conversations" })).toHaveAttribute("href", "/inbox")
    expect(screen.getByRole("link", { name: "Create an AI agent" })).toHaveAttribute("href", "/ai-agents/new")
    const booking = screen.getByRole("link", { name: "Book a demo or training" })
    expect(booking).toHaveAttribute("href", expect.stringContaining("app.jsynq.com/book/"))
    expect(booking).toHaveAttribute("rel", expect.stringContaining("noopener"))
    expect(screen.queryByTestId("activity-chart")).toBeNull()
  })

  it("explains an empty filtered view and offers to reset", () => {
    render(<ReportsView initial={initial(emptyOverview(), null, { ...FILTERS, channel: "sms" })} />)
    expect(screen.getByText("No activity for these filters")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Reset filters" }).length).toBeGreaterThan(0)
  })

  it("offers a retry when the report cannot load", async () => {
    loadReportAction.mockResolvedValueOnce(ok(overview()))
    render(<ReportsView initial={initial(null, { success: false, status: 502 })} />)
    expect(screen.getByText("We could not load your report.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByTestId("kpi-conversations")).toBeInTheDocument()
  })

  it("offers to reset filters the backend refused instead of a useless retry", async () => {
    loadReportAction.mockResolvedValueOnce(ok(overview()))
    render(<ReportsView initial={initial(null, { success: false, status: 400, reference: "REPORT_INVALID_FILTERS" })} />)
    expect(screen.getByText("These filters cannot be used")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull()
    fireEvent.click(screen.getAllByRole("button", { name: "Reset filters" })[0] as HTMLElement)
    expect(await screen.findByTestId("kpi-conversations")).toBeInTheDocument()
  })

  it("keeps the old numbers and says so when a filter change fails", async () => {
    loadReportAction.mockResolvedValueOnce({ success: false, status: 502 })
    render(<ReportsView initial={initial(overview())} />)
    fireEvent.click(screen.getByRole("button", { name: "7 days" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("The numbers below are from the previous filters")
    expect(screen.getByTestId("kpi-conversations")).toBeInTheDocument()
  })

  it("shows the plan gate, not a generic error, when the trial is over", () => {
    render(<ReportsView initial={initial(null, { success: false, status: 402, reference: "ATTENDE_TRIAL_EXPIRED" })} />)
    expect(screen.getByText("Reports are paused")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Go to subscription" })).toHaveAttribute("href", "/billing")
    expect(screen.queryByTestId("report-filters")).toBeNull()
  })
})

describe("ReportsView filters", () => {
  it("fetches the new period, keeps the old numbers visible meanwhile and keeps the URL in sync", async () => {
    let resolve: (v: unknown) => void = () => undefined
    loadReportAction.mockReturnValueOnce(new Promise((r) => (resolve = r)))
    render(<ReportsView initial={initial(overview())} />)
    fireEvent.click(screen.getByRole("button", { name: "7 days" }))
    expect(screen.getByTestId("kpi-conversations")).toBeInTheDocument()
    expect(screen.getByText("Updating…")).toBeInTheDocument()
    expect(loadReportAction).toHaveBeenCalledWith(expect.objectContaining({ channel: null, agentId: null }))
    expect(window.location.search).toBe("?days=7")
    const o7 = overview()
    o7.kpis = { ...o7.kpis, conversations: kpi(33, 30) }
    await act(async () => resolve(ok(o7)))
    expect(within(screen.getByTestId("kpi-conversations")).getByText("33")).toBeInTheDocument()
    expect(screen.queryByText("Updating…")).toBeNull()
  })

  it("ignores a slow answer that arrives after a newer request", async () => {
    const resolvers: Array<(v: unknown) => void> = []
    loadReportAction.mockImplementation(() => new Promise((r) => resolvers.push(r)))
    render(<ReportsView initial={initial(overview())} />)
    fireEvent.click(screen.getByRole("button", { name: "7 days" }))
    await waitFor(() => expect(loadReportAction).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole("button", { name: "90 days" }))
    await waitFor(() => expect(loadReportAction).toHaveBeenCalledTimes(2))
    const fresh = overview()
    fresh.kpis = { ...fresh.kpis, conversations: kpi(900, 800) }
    const stale = overview()
    stale.kpis = { ...stale.kpis, conversations: kpi(7, 6) }
    await act(async () => resolvers[1]?.(ok(fresh)))
    await act(async () => resolvers[0]?.(ok(stale)))
    expect(within(screen.getByTestId("kpi-conversations")).getByText("900")).toBeInTheDocument()
  })

  it("passes the channel and agent filters through", async () => {
    loadReportAction.mockResolvedValue(ok(overview()))
    render(<ReportsView initial={initial(overview())} />)
    fireEvent.change(screen.getByLabelText("Channel"), { target: { value: "whatsapp" } })
    await waitFor(() => expect(loadReportAction).toHaveBeenLastCalledWith(expect.objectContaining({ channel: "whatsapp" })))
    expect(window.location.search).toContain("channel=whatsapp")
    fireEvent.change(screen.getByLabelText("AI agent"), { target: { value: "none" } })
    await waitFor(() => expect(loadReportAction).toHaveBeenLastCalledWith(expect.objectContaining({ channel: "whatsapp", agentId: "none" })))
  })

  it("rejects an impossible custom range without calling the server", () => {
    render(<ReportsView initial={initial(overview())} />)
    fireEvent.click(screen.getByRole("button", { name: "Custom" }))
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-10-20" } })
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-10-10" } })
    fireEvent.click(screen.getByRole("button", { name: "Apply" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Pick a start that is not after the end")
    expect(loadReportAction).not.toHaveBeenCalled()
  })

  it("applies a valid custom range", async () => {
    loadReportAction.mockResolvedValue(ok(overview()))
    render(<ReportsView initial={initial(overview())} />)
    fireEvent.click(screen.getByRole("button", { name: "Custom" }))
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-08-01" } })
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-08-31" } })
    fireEvent.click(screen.getByRole("button", { name: "Apply" }))
    await waitFor(() => expect(loadReportAction).toHaveBeenCalledWith({ from: "2026-08-01", to: "2026-08-31", channel: null, agentId: null }))
    expect(window.location.search).toBe("?from=2026-08-01&to=2026-08-31")
  })
})
