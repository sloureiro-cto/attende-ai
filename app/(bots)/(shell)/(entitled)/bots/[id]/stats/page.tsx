import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getSalesBotAction, getSalesBotStatsAction } from "actions/messaging-automations/salesBots"
import { BotStatsView } from "components/bots-app/stats/BotStatsView"
import { getSalesBotStatsSeriesAction } from "components/bots-app/stats/statsActions"
import { parseStatsRange } from "components/bots-app/stats/statsMath"

export const metadata: Metadata = { title: "Automation performance" }

type Props = { params: { id: string }; searchParams: { days?: string | string[] } }

export default async function BotStatsPage({ params, searchParams }: Props) {
  const id = decodeURIComponent(params.id)
  const days = parseStatsRange(searchParams.days)

  // The bot, the funnel totals and the daily series are independent: ask for all three at once.
  const [bot, stats, series] = await Promise.all([
    getSalesBotAction(id),
    getSalesBotStatsAction(id, days),
    getSalesBotStatsSeriesAction(id, days),
  ])

  if (!bot.success) {
    if (bot.status === 404) notFound()
    throw new Error(bot.error || "bot_load_failed")
  }
  if (!stats.success) throw new Error(stats.error || "stats_load_failed")

  // A missing series only costs the trend chart.
  return <BotStatsView bot={bot.data} days={days} stats={stats.data} series={series.success ? series.data : null} />
}
