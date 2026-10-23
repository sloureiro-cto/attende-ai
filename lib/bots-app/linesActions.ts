"use server"

import { type LinesLoadResult, type LinesPillStatus, pillStatusOf } from "./lines"
import { loadLines } from "./loadLines"

/** Full channels page data. Called by the client for "Refresh" and after a connect/reconnect. */
export async function refreshLinesAction(): Promise<LinesLoadResult> {
  return loadLines()
}

/**
 * Side-menu alert data. Same loader and same mapping as /lines, so the alert and the list never disagree.
 * `null` means "could not tell" (not signed in a workspace, not entitled, backend down): the alert then stays hidden
 * instead of claiming a health state it does not know.
 */
export async function getLinesPillStatusAction(): Promise<LinesPillStatus | null> {
  const result = await loadLines({ withBots: false })
  if (result.failedChannels.length === 3) return null
  return pillStatusOf(result.lines)
}
