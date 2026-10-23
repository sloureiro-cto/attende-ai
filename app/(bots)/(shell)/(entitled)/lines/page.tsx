import { Metadata } from "next"
import { LinesView } from "components/bots-app/lines/LinesView"
import { loadLines } from "lib/bots-app/loadLines"

export const metadata: Metadata = { title: "Channels" }

type Props = { searchParams: { line?: string; reconnect?: string } }

/** All channels of the workspace. Sessions of the three channel types, automations and AI agents load in parallel. */
export default async function LinesPage({ searchParams }: Props) {
  const initial = await loadLines()
  return <LinesView initial={initial} channel={null} initialLineKey={searchParams.line ?? null} autoReconnect={searchParams.reconnect === "1"} />
}
