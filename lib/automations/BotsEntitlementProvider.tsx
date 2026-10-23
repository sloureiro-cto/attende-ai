"use client"

import { createContext, type ReactNode, useContext } from "react"

const BotsEntitlementContext = createContext(false)

/**
 * Standalone bots app only: the server layout resolves the workspace entitlement once (isBotsEnabled)
 * and hands it down, so client components never need Statsig. Defaults to `false` (fail closed).
 */
export function BotsEntitlementProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return <BotsEntitlementContext.Provider value={enabled}>{children}</BotsEntitlementContext.Provider>
}

export function useBotsEntitlement(): boolean {
  return useContext(BotsEntitlementContext)
}
