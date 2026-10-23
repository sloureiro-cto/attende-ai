import { Metadata } from "next"
import { auth } from "auth"
import { getCurrentWorkspace } from "components/bots-app/server/currentWorkspace"
import { TeamFrame } from "components/bots-app/team/TeamHeading"
import { TeamView } from "components/bots-app/team/TeamView"
import { loadTeam } from "lib/attende/loadTeam"

export const metadata: Metadata = { title: "Team" }

export default async function TeamPage() {
  const session = await auth()
  const workspaceId = session?.user.workspaceId ?? ""
  const workspace = await getCurrentWorkspace(workspaceId)
  const data = await loadTeam(workspaceId, workspace)

  return (
    <TeamFrame>
      <TeamView data={data} workspaceId={workspaceId} currentUserId={session?.user.id} />
    </TeamFrame>
  )
}
