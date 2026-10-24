import { Metadata } from "next"
import { auth } from "auth"
import { TeamFrame } from "components/bots-app/team/TeamHeading"
import { TeamView } from "components/bots-app/team/TeamView"
import { loadTeam } from "lib/attende/loadTeam"

export const metadata: Metadata = { title: "Team" }

export default async function TeamPage() {
  const session = await auth()
  const workspaceId = session?.user.workspaceId ?? ""
  const data = await loadTeam(workspaceId)

  return (
    <TeamFrame>
      <TeamView data={data} workspaceId={workspaceId} currentUserId={session?.user.id} />
    </TeamFrame>
  )
}
