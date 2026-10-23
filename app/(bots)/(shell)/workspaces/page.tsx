import { Metadata } from "next"
import { getWorkspacesAction } from "actions/workspaces/getWorkspaces"
import { auth } from "auth"
import { PageHeading } from "components/bots-app/PageHeading"
import { WorkspacePicker } from "components/bots-app/WorkspacePicker"

export const metadata: Metadata = { title: "Companies" }

export default async function WorkspacesPage() {
  const [session, result] = await Promise.all([auth(), getWorkspacesAction()])
  // The picker only shows a generic message: keep the real reason in the server log.
  if (!result.success) console.error("[bots-app] could not load workspaces:", result.error)

  return (
    <div className="flex flex-col gap-8">
      <PageHeading titleKey="workspacesTitle" subtitleKey="workspacesSubtitle" />
      <WorkspacePicker
        workspaces={result.success ? (result.data ?? []) : []}
        currentWorkspaceId={session?.user.workspaceId}
        loadFailed={!result.success}
      />
    </div>
  )
}
