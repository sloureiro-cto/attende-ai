import { Metadata } from "next"
import { listSalesBotsAction } from "actions/messaging-automations/salesBots"
import { BotsHubClient } from "components/bots-app/hub/BotsHubClient"
import { HUB_PAGE_SIZE } from "lib/automations/hubConstants"

export const metadata: Metadata = { title: "Automations" }

export default async function BotsHubPage() {
  // Only automations (sales bots) exist here: one list call (the JSYNQ hub also loads rules, which this app never shows).
  const result = await listSalesBotsAction({ page: 1, limit: HUB_PAGE_SIZE })
  return <BotsHubClient initial={{ data: result.success ? result.data : null, failed: !result.success }} />
}
