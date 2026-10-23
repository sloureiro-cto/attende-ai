import { Metadata } from "next"
import { auth } from "auth"
import { SetupWizard } from "components/bots-app/onboarding/SetupWizard"
import { loadActivationData } from "lib/attende/activationData"

export const metadata: Metadata = { title: "Setup" }

/** Guided setup: the home's activation steps, one at a time. Every state is read from the API (nothing is kept in the browser). */
export default async function SetupPage() {
  const session = await auth()
  const data = await loadActivationData({ workspaceId: session?.user?.workspaceId ?? "", withInbox: false, withTeam: false })
  return <SetupWizard data={data} />
}
