/** Banned / restricted numbers must not stay selectable on inbound automations. */
export function isSelectableWhatsAppAutomationSession(session: {
  status?: string
}): boolean {
  return String(session.status ?? "").toLowerCase() !== "banned"
}

export function selectableWhatsAppAutomationSessions<T extends { _id: string; status?: string }>(
  sessions: T[]
): T[] {
  return sessions.filter(isSelectableWhatsAppAutomationSession)
}

/** Drop ids that are gone, banned, or not in the current session list. */
export function intersectEnabledSessionIds(
  ids: string[],
  sessions: Array<{ _id: string; status?: string }>
): string[] {
  const allowed = new Set(selectableWhatsAppAutomationSessions(sessions).map((session) => session._id))
  return ids.filter((id) => Boolean(id) && allowed.has(id))
}
