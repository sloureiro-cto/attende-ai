import type { AdvancedAutomationListResponse } from "lib/automations/types"

export type BotsHubMetrics = {
  active: number
  all: number
  paused: number
  drafts: number
  /** Conversations started in the last 30 days, or `null` when the list shows only part of the automations (a partial sum would mislead). */
  started30d: number | null
  /** Conversations that reached the end of the flow in the last 30 days (same base as `started30d`). */
  completed30d: number | null
  /** `completed30d / started30d` in 0..1, or `null` when nothing started / partial list. Shown next to its base. */
  completionRate: number | null
}

/**
 * Header numbers of the automations hub. The list endpoint gives status totals for ALL automations, but per-item
 * stats only for the loaded page; the 30-day figures are shown only when that page is the whole list.
 */
export function computeBotsHubMetrics(data: AdvancedAutomationListResponse | null): BotsHubMetrics | null {
  if (!data) return null
  const { totals } = data
  const complete = data.items.length === totals.all
  let started = 0
  let completed = 0
  for (const bot of data.items) {
    started += bot.stats30d.started
    completed += bot.stats30d.completed
  }
  return {
    active: totals.active,
    all: totals.all,
    paused: totals.paused,
    drafts: totals.draft,
    started30d: complete ? started : null,
    completed30d: complete ? completed : null,
    completionRate: complete && started > 0 ? completed / started : null,
  }
}
