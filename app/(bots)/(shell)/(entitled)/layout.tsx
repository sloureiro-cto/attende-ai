import { ReactNode } from "react"
import { requireEntitledWorkspace } from "components/bots-app/server/guards"
import { BotsEntitlementProvider } from "lib/automations/BotsEntitlementProvider"

/** Pages inside the shell that need bots: the workspace must be entitled, and client code learns it from here. */
export default async function EntitledLayout({ children }: { children: ReactNode }) {
  await requireEntitledWorkspace()
  return <BotsEntitlementProvider enabled>{children}</BotsEntitlementProvider>
}
