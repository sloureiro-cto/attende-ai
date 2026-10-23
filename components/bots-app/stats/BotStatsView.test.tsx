import { fireEvent, render, screen, within } from "@testing-library/react"
import type { SalesBotNode, SalesBotStatsSummary } from "lib/automations/types"
import { BotStatsView } from "./BotStatsView"
import type { DailyStatsPoint } from "./statsMath"

jest.mock("context/UserLanguageContext", () => ({ useUserLanguage: () => ({ userLanguage: "english" }) }))
// The settings dictionary pulls the auth stack in through its hook; only the strings matter here.
jest.mock("hooks/useWorkspaceSettingsTranslation", () => ({
  useWorkspaceSettingsTranslation: () => ({ t: (k: string) => k, language: "english" }),
}))

const msg = (id: string, text: string, over: Record<string, unknown> = {}): SalesBotNode =>
  ({
    id,
    kind: "send_message",
    text,
    replyMode: "buttons",
    options: [
      { id: "a", label: "Quote" },
      { id: "b", label: "Talk to us" },
    ],
    x: 0,
    y: 0,
    ...over,
  }) as SalesBotNode
const stop = (id: string): SalesBotNode => ({ id, kind: "stop", x: 0, y: 0 }) as SalesBotNode
const edge = (from: string, output: string, to: string) => ({ id: `${from}_${output}_${to}`, from, output, to })

const bot = {
  id: "bot1",
  name: "Quotes bot",
  startNodeId: "ask",
  nodes: [msg("ask", "How can we help?"), stop("end")],
  edges: [edge("ask", "a", "end"), edge("ask", "b", "end")],
}

const stats: SalesBotStatsSummary = {
  started: 100,
  completed: 40,
  handedOff: 10,
  stopped: 5,
  failed: 5,
  completionRate: 0.4,
  nodes: {
    ask: { reached: 100, exits: { a: 50, b: 20 }, reachedPct: 1 },
    end: { reached: 70, exits: {}, reachedPct: 0.7 },
  },
}

const series: DailyStatsPoint[] = [
  { day: "2026-10-20", started: 10, completed: 4, handedOff: 1, stopped: 0, failed: 0 },
  { day: "2026-10-21", started: 30, completed: 12, handedOff: 3, stopped: 1, failed: 1 },
  { day: "2026-10-22", started: 60, completed: 24, handedOff: 6, stopped: 4, failed: 4 },
]

const renderView = (over: Partial<Parameters<typeof BotStatsView>[0]> = {}) =>
  render(<BotStatsView bot={bot} days={30} stats={stats} series={series} {...over} />)

describe("BotStatsView", () => {
  it("shows the headline numbers with their rates", () => {
    renderView()
    const kpis = screen.getByRole("region", { name: "Automation performance" })
    expect(within(kpis).getByText("Started").parentElement).toHaveTextContent("100")
    expect(within(kpis).getByText("Completed").parentElement).toHaveTextContent("40")
    expect(within(kpis).getByText("Completed").parentElement).toHaveTextContent("40% of the 100 started")
    expect(within(kpis).getByText("Failed").parentElement).toHaveTextContent("5")
    // 100 started, 60 ended: 40 still running.
    expect(within(kpis).getByText("Still running").parentElement).toHaveTextContent("40")
  })

  it("marks the selected period and links the others", () => {
    renderView({ days: 7 })
    const nav = screen.getByRole("navigation", { name: "Period" })
    expect(within(nav).getByRole("link", { name: "7 days" })).toHaveAttribute("aria-current", "page")
    expect(within(nav).getByRole("link", { name: "30 days" })).toHaveAttribute("href", "/bots/bot1/stats?days=30")
    expect(within(nav).getByRole("link", { name: "90 days" })).not.toHaveAttribute("aria-current")
  })

  it("links back to the builder and to the automations list", () => {
    renderView()
    expect(screen.getByRole("link", { name: "Open in builder" })).toHaveAttribute("href", "/bots/bot1?stats=1")
    expect(screen.getByRole("link", { name: "Back to automations" })).toHaveAttribute("href", "/bots")
  })

  it("lists the funnel in flow order with exits and the drop-off", () => {
    renderView()
    const funnel = screen.getByRole("heading", { name: "Where leads go" }).closest("div") as HTMLElement
    expect(within(funnel).getByText("How can we help?")).toBeInTheDocument()
    expect(within(funnel).getByText("100 reached")).toBeInTheDocument()
    expect(within(funnel).getByText("Quote")).toBeInTheDocument()
    expect(within(funnel).getByText("30 did not continue (30%)")).toBeInTheDocument()
    expect(within(funnel).getByText("Ends the flow")).toBeInTheDocument()
  })

  it("ranks the biggest drop-off", () => {
    renderView()
    const drops = screen.getByRole("heading", { name: "Biggest drop-offs" }).closest("div") as HTMLElement
    expect(within(drops).getByText(/1\. How can we help\?/)).toBeInTheDocument()
    expect(within(drops).getByText("30 lost")).toBeInTheDocument()
  })

  it("explains the empty period instead of drawing empty charts", () => {
    renderView({
      stats: { ...stats, started: 0, completed: 0, handedOff: 0, stopped: 0, failed: 0, nodes: {} },
      series: series.map((p) => ({ ...p, started: 0, completed: 0 })),
    })
    expect(screen.getByText("No runs in this period")).toBeInTheDocument()
    expect(screen.queryByText("Runs per day")).not.toBeInTheDocument()
  })

  it("keeps the page usable when only the daily series failed", () => {
    renderView({ series: null })
    expect(screen.getByText("The daily chart is not available right now.")).toBeInTheDocument()
    expect(screen.getByText("Where leads go")).toBeInTheDocument()
  })
})

describe("TrendChart", () => {
  it("describes the chart for assistive tech and offers the same numbers as a table", () => {
    renderView()
    expect(
      screen.getByRole("img", { name: "Line chart of runs per day. 100 started and 40 completed in the period." })
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Table" }))
    const table = screen.getByRole("table")
    const rows = within(table).getAllByRole("row")
    expect(rows).toHaveLength(4)
    // Newest day first.
    expect(rows[1]).toHaveTextContent("Oct 22")
    expect(rows[1]).toHaveTextContent("60")
    expect(screen.getByRole("button", { name: "Table" })).toHaveAttribute("aria-pressed", "true")
  })

  it("inspects a day with the keyboard and clears on Escape", () => {
    renderView()
    const chart = screen.getByRole("img", { name: /runs per day/i })
    fireEvent.keyDown(chart, { key: "ArrowLeft" })
    const tooltip = screen.getByRole("status")
    expect(tooltip).toHaveTextContent("Oct 22")
    expect(tooltip).toHaveTextContent("Started: 60")
    expect(tooltip).toHaveTextContent("Completed: 24")
    fireEvent.keyDown(chart, { key: "ArrowLeft" })
    expect(screen.getByRole("status")).toHaveTextContent("Oct 21")
    fireEvent.keyDown(chart, { key: "Escape" })
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
