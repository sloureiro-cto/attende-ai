import { Metadata } from "next"
import { BotBuilderClient } from "components/automations/bot/BotBuilderClient"
import { loadNewBotPage } from "lib/automations/server/botPages"

export const metadata: Metadata = { title: "New automation" }

export default async function NewBotPage({ searchParams }: { searchParams: { channel?: string; template?: string } }) {
  const { context, seed } = await loadNewBotPage(searchParams)
  return <BotBuilderClient initial={null} context={context} seed={seed} />
}
