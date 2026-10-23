/** Figma 921:4293 — agent header badge colors (6×2). */
export const AGENT_BADGE_COLORS = [
  "#10B981",
  "#3D63FF",
  "#8B49E7",
  "#F87171",
  "#FF3892",
  "#FFB538",
  "#58CEA7",
  "#8FA5FF",
  "#DBC5FA",
  "#FCA5A5",
  "#FF8CC0",
  "#FFDCA1",
] as const

export type AgentBadgeColor = (typeof AGENT_BADGE_COLORS)[number]

/** Figma 921:4293 — 6×4 icon grid, row-major. */
export const AGENT_BADGE_ICON_KEYS = [
  "sparkle",
  "kanban",
  "filter",
  "dollar-sign",
  "chart",
  "megaphone",
  "presention-chart",
  "trend-up",
  "balance",
  "people",
  "global",
  "medal",
  "code-circle",
  "code",
  "cpu",
  "setting-2",
  "path",
  "brush",
  "heart",
  "health",
  "brain",
  "teacher",
  "book",
  "bookmark",
] as const

export type AgentBadgeIconKey = (typeof AGENT_BADGE_ICON_KEYS)[number]

export const DEFAULT_AGENT_BADGE_ICON: AgentBadgeIconKey = "kanban"
export const DEFAULT_AGENT_BADGE_COLOR: AgentBadgeColor = "#10B981"

export function agentBadgeIconSrc(key: string): string {
  return `/icons/agent-badge/${key}.svg`
}

export const AGENT_BADGE_CHECK_SRC = "/icons/agent-badge/check.svg"

export function isAgentBadgeIconKey(value: string | undefined): value is AgentBadgeIconKey {
  return Boolean(value && (AGENT_BADGE_ICON_KEYS as readonly string[]).includes(value))
}

export function isAgentBadgeColor(value: string | undefined): value is AgentBadgeColor {
  if (!value) return false
  const normalized = value.trim().toUpperCase()
  return (AGENT_BADGE_COLORS as readonly string[]).includes(normalized)
}

export function resolveAgentBadgeIcon(value: string | undefined): AgentBadgeIconKey {
  return isAgentBadgeIconKey(value) ? value : DEFAULT_AGENT_BADGE_ICON
}

export function resolveAgentBadgeColor(value: string | undefined): AgentBadgeColor {
  if (!value) return DEFAULT_AGENT_BADGE_COLOR
  const normalized = value.trim().toUpperCase()
  return isAgentBadgeColor(normalized) ? (normalized as AgentBadgeColor) : DEFAULT_AGENT_BADGE_COLOR
}
