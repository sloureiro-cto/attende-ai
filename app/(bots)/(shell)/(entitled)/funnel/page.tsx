import { Metadata } from "next"
import { loadFunnelContactsAction, loadFunnelPageAction, loadFunnelStagesAction } from "actions/attende/funnel"
import { type FunnelInitial, FunnelView } from "components/bots-app/funnel/FunnelView"
import { effectiveSearch, parseFunnelParams } from "lib/attende/funnel/model"
import type { AttendeActionResult } from "lib/attende/result"

export const metadata: Metadata = { title: "Funnel" }

type SearchParams = Record<string, string | string[] | undefined>

const toList = <T,>(res: AttendeActionResult<T>) => (res.success ? { page: res.data, error: null } : { page: null, error: res })

/** The first page of the tab in the URL (and the stage chips) render on the server; the rest goes through server actions. */
export default async function FunnelPage({ searchParams }: { searchParams: SearchParams }) {
  const state = parseFunnelParams(searchParams)
  const args = { limit: state.pageSize, maskPhone: state.maskPhone }
  const stagesPromise = loadFunnelStagesAction()
  let lists: Pick<FunnelInitial, "deals" | "contacts">
  if (state.tab === "deals") lists = { deals: toList(await loadFunnelPageAction(state.filters, args)), contacts: null }
  else lists = { deals: null, contacts: toList(await loadFunnelContactsAction(effectiveSearch(state.filters.q), args)) }
  const stages = await stagesPromise
  return <FunnelView initial={{ state, stages: stages.success ? stages.data : null, stagesError: stages.success ? null : stages, ...lists }} />
}
