"use client"

import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SessionProvider } from "next-auth/react"
import { ReactNode, useState } from "react"
import { ToastContainer } from "react-toastify"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { InitialPermissions } from "app/api/permissions"
import { ExclusiveOverlayProvider } from "context/ExclusiveOverlayContext"
import { PermissionsProvider } from "context/PermissionsContext"
import { RolesProvider } from "context/RolesContext"
import { UserLanguageProvider } from "context/UserLanguageContext"
import { IWorkspace, WorkspaceProvider } from "context/WorkspaceContext"
import { HtmlLang } from "./HtmlLang"
import "react-toastify/dist/ReactToastify.css"

/** Seconds. Same cadence as the main app: the session refresh re-issues the short-lived apiToken. */
const SESSION_REFETCH_INTERVAL_SEC = 5 * 60

type Props = {
  children: ReactNode
  initialWorkspace?: IWorkspace | null
  initialPermissions?: InitialPermissions
}

/**
 * The deliberately small provider stack of the bots app. The main app's stack (projects, boards,
 * calls, timers, assistant, ...) is not mounted: only what the shell and the bot builder need.
 * Fork the builder's extra needs (labels, project forms) in here, not in the main providers.
 */
export function BotsProviders({ children, initialWorkspace = null, initialPermissions = null }: Props) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }))

  return (
    <AppRouterCacheProvider>
      <SessionProvider refetchInterval={SESSION_REFETCH_INTERVAL_SEC} refetchOnWindowFocus>
        <QueryClientProvider client={queryClient}>
          <WorkspaceProvider initialCurrentWorkspace={initialWorkspace}>
            <PermissionsProvider initialPermissions={initialPermissions}>
              <RolesProvider>
                <UserLanguageProvider>
                  <HtmlLang />
                  <ExclusiveOverlayProvider>
                    <TooltipProvider>
                      {children}
                      <ToastContainer position="top-right" autoClose={5000} newestOnTop closeOnClick limit={3} pauseOnHover />
                    </TooltipProvider>
                  </ExclusiveOverlayProvider>
                </UserLanguageProvider>
              </RolesProvider>
            </PermissionsProvider>
          </WorkspaceProvider>
        </QueryClientProvider>
      </SessionProvider>
    </AppRouterCacheProvider>
  )
}
