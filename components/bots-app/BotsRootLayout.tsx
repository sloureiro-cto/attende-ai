import { ReactNode } from "react"
import { getUserPermissions, type InitialPermissions } from "app/api/permissions"
import { auth } from "auth"
import { DynamicStatsigProvider } from "components/StatSig/dynamic-statsig-provider"
import { botsFlagUser } from "lib/automations/botsFlag"
import { statsigAdapter } from "lib/statsig/jsynqStatsigAdapter"
import "styles/bots-theme.css"
import { BotsProviders } from "./BotsProviders"
import { getCurrentWorkspace } from "./server/currentWorkspace"
import { THEME_BOOT_SCRIPT } from "./themeScript"

/**
 * Root document of the app (rendered by app/layout.tsx). The first paint needs the session, the current
 * workspace and permissions only.
 */
export async function BotsRootLayout({ children }: { children: ReactNode }) {
  const session = await auth()

  let initialWorkspace = null
  let initialPermissions: InitialPermissions = null
  if (session?.user) {
    const [workspace, permissionsData] = await Promise.all([
      getCurrentWorkspace(session.user.workspaceId),
      getUserPermissions(),
    ])
    initialWorkspace = workspace
    initialPermissions = permissionsData
      ? { roles: permissionsData.roles, entityByPass: permissionsData.entityByPass ?? null }
      : null
  }

  const Statsig = await statsigAdapter.initialize()
  const datafile = Statsig.getClientInitializeResponse(botsFlagUser(session), { hash: "djb2" })

  return (
    <html lang="en" translate="no" data-app="bots" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Applies the saved (or system) theme before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <DynamicStatsigProvider datafile={datafile}>
        <body className="min-h-screen bg-neutral-10 font-sans text-neutral-700 antialiased">
          <BotsProviders initialWorkspace={initialWorkspace} initialPermissions={initialPermissions}>
            {children}
          </BotsProviders>
        </body>
      </DynamicStatsigProvider>
    </html>
  )
}
