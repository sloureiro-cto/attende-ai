import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { ConnectInfo } from "components/bots-app/lines/ConnectInfo"
import { isLineChannel } from "lib/bots-app/lines"

export const metadata: Metadata = { title: "Connect a channel" }

/**
 * /lines/<channel>/connect. WhatsApp: the connect flow lives on the channel page (opened by ?connect=1), so
 * this just forwards there. Instagram and SMS are linked in JSYNQ (hosted authorization, provider credentials).
 */
export default function LineConnectPage({ params }: { params: { channel: string } }) {
  if (!isLineChannel(params.channel)) notFound()
  if (params.channel === "whatsapp") redirect("/lines/whatsapp?connect=1")
  return <ConnectInfo channel={params.channel} />
}
