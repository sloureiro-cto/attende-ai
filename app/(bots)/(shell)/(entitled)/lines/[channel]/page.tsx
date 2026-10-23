import { Metadata } from "next"
import { notFound } from "next/navigation"
import { LinesView } from "components/bots-app/lines/LinesView"
import { isLineChannel } from "lib/bots-app/lines"
import { loadLines } from "lib/bots-app/loadLines"

export const metadata: Metadata = { title: "Channels" }

type Props = {
  params: { channel: string }
  searchParams: { connect?: string; line?: string; reconnect?: string }
}

/**
 * Channels of one type: /lines/whatsapp, /lines/instagram, /lines/sms. `?connect=1` opens the WhatsApp connect flow;
 * `?line=whatsapp:<id>` opens that channel's details and `&reconnect=1` starts its reconnect (side-menu alert links).
 */
export default async function LinesChannelPage({ params, searchParams }: Props) {
  if (!isLineChannel(params.channel)) notFound()
  const initial = await loadLines()
  return (
    <LinesView
      initial={initial}
      channel={params.channel}
      autoConnect={searchParams.connect === "1"}
      initialLineKey={searchParams.line ?? null}
      autoReconnect={searchParams.reconnect === "1"}
    />
  )
}
