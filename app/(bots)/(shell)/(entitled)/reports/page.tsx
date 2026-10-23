import { Metadata } from "next"
import { loadReportAction } from "actions/attende/reports"
import { ReportsView } from "components/bots-app/reports/ReportsView"
import { parseReportFilters } from "lib/attende/reports/model"

export const metadata: Metadata = { title: "Reports" }

type SearchParams = Record<string, string | string[] | undefined>

/** The first answer is rendered on the server for the filters in the URL; later changes use the server action. */
export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const { filters, preset } = parseReportFilters(searchParams)
  const result = await loadReportAction(filters)
  return <ReportsView initial={{ filters, preset, data: result.success ? result.data : null, error: result.success ? null : result }} />
}
