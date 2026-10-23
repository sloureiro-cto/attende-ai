import { ReactNode } from "react"
import { requireEntitledWorkspace } from "components/bots-app/server/guards"
import { BotsEntitlementProvider } from "lib/automations/BotsEntitlementProvider"

/**
 * The bot builder owns the whole viewport (its own header, palette and inspector), so it lives in a
 * sibling route group WITHOUT the shell. Same guards as the shell pages: session + entitled workspace.
 */
export default async function BuilderLayout({ children }: { children: ReactNode }) {
  await requireEntitledWorkspace()
  return <BotsEntitlementProvider enabled>{children}</BotsEntitlementProvider>
}
