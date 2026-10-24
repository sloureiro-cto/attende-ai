"use client"

import { useRef, useState } from "react"
import {
  createAutomationAction,
  deleteAutomationAction,
  getAutomationAction,
  updateAutomationAction,
} from "actions/messaging-automations/automations"
import { deleteAdvancedAutomationAction, updateAdvancedAutomationAction } from "actions/messaging-automations/advancedAutomations"
import { showToast } from "app/utils/showToast"
import type { AutomationsTFn } from "components/automations/ui/useAutomationsT"
import { copyName } from "lib/automations/copyName"
import type { AutomationListItem, AdvancedAutomationListItem } from "lib/automations/types"
import type { useHubData } from "./useHubData"

type PendingDelete = { kind: "rule" | "bot"; id: string; name: string }

/** What the row actions need from a hub: the full hub state of the JSYNQ app, or the bots-only state of the bots app. */
export type HubActionsTarget = Pick<
  ReturnType<typeof useHubData>,
  "patchRule" | "patchBot" | "addActiveRules" | "reloadCurrent" | "items" | "page" | "setPageAfterDelete"
>

/** Row actions of the hub (toggle, duplicate, delete), each guarded against double submits and rolled back on failure. */
export function useHubActions(hub: HubActionsTarget, t: AutomationsTFn) {
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [duplicating, setDuplicating] = useState<string | null>(null)

  // Ids with a request in flight: a second click would reuse a stale `expectedUpdatedAt` and roll back wrongly.
  const busy = useRef(new Set<string>())
  const guarded = async (id: string, run: () => Promise<unknown>) => {
    if (busy.current.has(id)) return
    busy.current.add(id)
    try {
      await run()
    } finally {
      busy.current.delete(id)
    }
  }

  const toggleRule = (item: AutomationListItem) =>
    guarded(item.id, async () => {
      const nextStatus = item.status === "active" ? "paused" : "active"
      hub.patchRule(item.id, { status: nextStatus }) // optimistic
      const res = await updateAutomationAction(item.id, { status: nextStatus, expectedUpdatedAt: item.updatedAt })
      if (!res.success) {
        hub.patchRule(item.id, { status: item.status })
        showToast("error", res.status === 409 ? t("automationsHubConflict") : t("automationsHubToggleError"))
        return
      }
      // A classic automation joins the hub model on its first edit and gets a new id.
      hub.patchRule(item.id, { id: res.data.id, status: res.data.status, updatedAt: res.data.updatedAt })
      hub.addActiveRules(nextStatus === "active" ? 1 : -1)
    })

  const toggleBot = (item: AdvancedAutomationListItem) =>
    guarded(item.id, async () => {
      const nextStatus = item.status === "active" ? "paused" : "active"
      hub.patchBot(item.id, { status: nextStatus })
      const res = await updateAdvancedAutomationAction(item.id, { status: nextStatus, expectedUpdatedAt: item.updatedAt })
      if (!res.success) {
        hub.patchBot(item.id, { status: item.status })
        // Activating an incomplete bot is refused with the reasons; say so instead of a generic error.
        showToast("error", res.issues?.length ? t("automationsHubBotIncomplete") : t("automationsHubToggleError"))
        return
      }
      hub.patchBot(item.id, { status: res.data.status, updatedAt: res.data.updatedAt })
    })

  const duplicateRule = (item: AutomationListItem) =>
    guarded(`dup:${item.id}`, async () => {
      setDuplicating(item.id)
      try {
        const detail = await getAutomationAction(item.id)
        if (!detail.success) return showToast("error", t("automationsHubDuplicateError"))
        const created = await createAutomationAction({
          name: copyName(detail.data.name, t("automationsHubCopySuffix")),
          priority: detail.data.priority,
          status: "paused", // never start a copy that nobody has looked at
          root: detail.data.root,
          channels: detail.data.channels.map((c) => ({ channel: c.channel, enabledSessionIds: c.enabledSessionIds })),
          testCases: detail.data.testCases,
        })
        if (!created.success) return showToast("error", t("automationsHubDuplicateError"))
        showToast("success", t("automationsHubDuplicated"))
        void hub.reloadCurrent()
      } finally {
        setDuplicating(null)
      }
    })

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    const res = pendingDelete.kind === "rule" ? await deleteAutomationAction(pendingDelete.id) : await deleteAdvancedAutomationAction(pendingDelete.id)
    setDeleting(false)
    if (!res.success) return showToast("error", t("automationsHubDeleteError"))
    setPendingDelete(null)
    showToast("success", t("automationsHubDeleted"))
    hub.setPageAfterDelete(hub.items.length === 1 && hub.page > 1)
  }

  return { toggleRule, toggleBot, duplicateRule, duplicatingId: duplicating, pendingDelete, setPendingDelete, deleting, confirmDelete }
}
