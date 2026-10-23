"use server"

import { HUB_PAGE_SIZE } from "lib/automations/hubConstants"
import type {
  AutomationChannel,
  AutomationListResponse,
  SalesBotListResponse,
} from "lib/automations/types"
import { listAutomationsAction } from "./automations"
import { BOTS_DISABLED_MESSAGE, botsGate } from "./gate"
import { listSalesBotsAction } from "./salesBots"

export type HubTab = "rules" | "bots"

export type HubData = {
  rules: AutomationListResponse | null
  bots: SalesBotListResponse | null
  /** Both counts are always present so the tab badges don't depend on which tab is open; `null` = could not be loaded. */
  counts: { rules: number | null; bots: number | null }
  /** Set when the REQUESTED tab's list failed (the other tab's failure only makes its count `null`). */
  error?: string
}

/**
 * One server action for the whole hub. Next.js runs a client's server actions one at a time, so the
 * hub never fires several; this loads the active tab's page and the other tab's total (limit 1)
 * together on the server instead.
 */
export async function loadAutomationsHubAction(params: {
  tab: HubTab
  q?: string
  channel?: AutomationChannel
  page?: number
}): Promise<HubData> {
  if (await botsGate()) return { rules: null, bots: null, counts: { rules: null, bots: null }, error: BOTS_DISABLED_MESSAGE }
  const page = Math.max(1, params.page ?? 1)
  const [rules, bots] = await Promise.all([
    listAutomationsAction({
      q: params.tab === "rules" ? params.q : undefined,
      channel: params.tab === "rules" ? params.channel : undefined,
      page: params.tab === "rules" ? page : 1,
      limit: params.tab === "rules" ? HUB_PAGE_SIZE : 1,
    }),
    listSalesBotsAction({
      q: params.tab === "bots" ? params.q : undefined,
      channel: params.tab === "bots" ? params.channel : undefined,
      page: params.tab === "bots" ? page : 1,
      limit: params.tab === "bots" ? HUB_PAGE_SIZE : 1,
    }),
  ])

  const error = (params.tab === "rules" ? rules : bots).success
    ? undefined
    : ((params.tab === "rules" ? rules : bots) as { error: string }).error || "load_failed"

  return {
    rules: rules.success ? rules.data : null,
    bots: bots.success ? bots.data : null,
    counts: {
      rules: rules.success ? rules.data.totals.all : null,
      bots: bots.success ? bots.data.totals.all : null,
    },
    ...(error ? { error } : {}),
  }
}
