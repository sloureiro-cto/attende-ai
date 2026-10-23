import type { CSSProperties } from "react"
import type { IWorkspace } from "context/WorkspaceContext"

export type WorkspaceSidebarColorMode = "solid" | "gradient"

export type IWorkspaceCustomBranding = {
  enabled: boolean
  sidebarColor?: string | null
  /** "gradient" (default, matches pre-existing behavior) fades from a fixed dark top stop into
   *  sidebarColor; "solid" fills the sidebar with sidebarColor alone. */
  sidebarColorMode?: WorkspaceSidebarColorMode | null
}

export const DEFAULT_SIDEBAR_GRADIENT_FROM = "#1C2223"
export const DEFAULT_SIDEBAR_GRADIENT_TO = "#45AD7E"
export const DEFAULT_SIDEBAR_ACCENT_COLOR = DEFAULT_SIDEBAR_GRADIENT_TO
export const DEFAULT_SIDEBAR_COLOR_MODE: WorkspaceSidebarColorMode = "gradient"

export function normalizeWorkspaceCustomBranding(value?: IWorkspaceCustomBranding | null): IWorkspaceCustomBranding {
  return {
    enabled: value?.enabled === true,
    sidebarColor: value?.sidebarColor?.trim() || null,
    sidebarColorMode: value?.sidebarColorMode === "solid" ? "solid" : DEFAULT_SIDEBAR_COLOR_MODE,
  }
}

export function isHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())
}

export function resolveSidebarBackgroundStyle(
  workspace: Pick<IWorkspace, "customBranding"> | null | undefined
): CSSProperties | undefined {
  const branding = normalizeWorkspaceCustomBranding(workspace?.customBranding)
  if (!branding.enabled) return undefined

  const accent =
    branding.sidebarColor && isHexColor(branding.sidebarColor) ? branding.sidebarColor : DEFAULT_SIDEBAR_GRADIENT_TO

  if (branding.sidebarColorMode === "solid") {
    return { backgroundColor: accent }
  }

  return {
    backgroundImage: `linear-gradient(180deg, ${DEFAULT_SIDEBAR_GRADIENT_FROM} 0%, ${accent} 100%)`,
  }
}

export function shouldUseWorkspaceLogoInSidebar(
  workspace: Pick<IWorkspace, "customBranding" | "logo"> | null | undefined
): boolean {
  const branding = normalizeWorkspaceCustomBranding(workspace?.customBranding)
  return branding.enabled && Boolean(workspace?.logo?.trim())
}
