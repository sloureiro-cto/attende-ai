import { Metadata } from "next"
import { auth } from "auth"
import { HomeView } from "components/bots-app/start/HomeView"
import { loadActivationData } from "lib/attende/activationData"

export const metadata: Metadata = { title: "Home" }

/** Home: channels, AI agents, the inbox counters and the team size load in parallel; each can fail on its own. */
export default async function StartPage() {
  const session = await auth()
  const data = await loadActivationData({ workspaceId: session?.user?.workspaceId ?? "" })
  return <HomeView data={data} />
}
