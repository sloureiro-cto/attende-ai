import { Metadata } from "next"
import { BotBuilderClient } from "components/automations/bot/BotBuilderClient"
import { loadEditBotPage } from "lib/automations/server/botPages"

export const metadata: Metadata = { title: "Edit automation" }

export default async function EditBotPage({ params }: { params: { id: string } }) {
  const { detail, context } = await loadEditBotPage(params.id)
  return <BotBuilderClient initial={detail} context={context} />
}
