/** Matches the backend limit on automation names. */
export const AUTOMATION_NAME_MAX = 120

/** "<name> (<suffix>)", with the base name trimmed so the result always fits the backend limit. */
export function copyName(name: string, suffix: string): string {
  const tail = ` (${suffix})`
  const base = name.trim()
  const room = Math.max(1, AUTOMATION_NAME_MAX - tail.length)
  return `${base.length > room ? base.slice(0, room).trimEnd() : base}${tail}`
}
