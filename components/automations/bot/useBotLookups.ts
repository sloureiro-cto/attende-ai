"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { getLabelsAction } from "actions/labels/getLabels"
import { listSalesBotsAction } from "actions/messaging-automations/salesBots"
import { getCardFieldDefinitionsAction, type ICardFieldDefinition } from "actions/projects/cardFieldDefinitions"
import { getWorkspaceRoles } from "actions/roles/getWorkspaceRoles"
import { getUsersFromWorkspace, type WorkspaceUser } from "actions/users/getUsersFromWorkspace"
import { listCloudTemplatesAction } from "actions/whatsapp-lite/cloudTemplates"
import type { WhatsAppCloudTemplate } from "actions/whatsapp-lite/types"
import type { IColumn } from "app/_types/Column"
import type { ILabel } from "app/_types/Label"
import type { IProject } from "app/_types/Project"
import type { IRole } from "app/_types/Role"
import { useProjectColumns } from "components/automations/ui/useProjectColumns"
import type { SalesBotListItem } from "lib/automations/types"

type Loadable<T> = { status: "idle" | "loading" | "ready" | "error"; data: T }

const idle = <T>(data: T): Loadable<T> => ({ status: "idle", data })

/**
 * Lazy lookups for the step inspector. Each list loads once, the first time a step that needs it
 * is opened (never on page load), and failures degrade to an empty picker.
 */
export function useBotLookups(workspaceId: string, currentBotId?: string) {
  const [templates, setTemplates] = useState<Loadable<WhatsAppCloudTemplate[]>>(idle([]))
  const [allBots, setBots] = useState<Loadable<SalesBotListItem[]>>(idle([]))
  const [users, setUsers] = useState<Loadable<WorkspaceUser[]>>(idle([]))
  const [roles, setRoles] = useState<Loadable<IRole[]>>(idle([]))
  const [fields, setFields] = useState<Record<string, Loadable<ICardFieldDefinition[]>>>({})
  const columnsLoader = useProjectColumns()
  const [labels, setLabels] = useState<Record<string, Loadable<ILabel[]>>>({})
  const started = useRef(new Set<string>())

  /** Runs a loader once; a loader that reports failure is forgotten so the next open retries it. */
  const once = useCallback((key: string, run: () => Promise<boolean>) => {
    if (started.current.has(key)) return
    started.current.add(key)
    void run()
      .then((ok) => {
        if (!ok) started.current.delete(key)
      })
      .catch(() => started.current.delete(key))
  }, [])

  const loadTemplates = useCallback(
    () =>
      once("templates", async () => {
        setTemplates({ status: "loading", data: [] })
        const res = await listCloudTemplatesAction()
        setTemplates(
          res.success
            ? { status: "ready", data: res.data.filter((x) => x.status === "APPROVED") }
            : { status: "error", data: [] }
        )
        return res.success
      }),
    [once]
  )

  const loadBots = useCallback(
    () =>
      once("bots", async () => {
        setBots({ status: "loading", data: [] })
        const res = await listSalesBotsAction({ limit: 200 })
        setBots(
          res.success
            ? { status: "ready", data: res.data.items }
            : { status: "error", data: [] }
        )
        return res.success
      }),
    [once]
  )

  const loadUsers = useCallback(
    () =>
      once("users", async () => {
        setUsers({ status: "loading", data: [] })
        const res = await getUsersFromWorkspace(workspaceId)
        setUsers(res.success ? { status: "ready", data: res.data ?? [] } : { status: "error", data: [] })
        return res.success
      }),
    [once, workspaceId]
  )

  const loadRoles = useCallback(
    () =>
      once("roles", async () => {
        setRoles({ status: "loading", data: [] })
        const res = await getWorkspaceRoles({ workspaceId })
        setRoles(res.success ? { status: "ready", data: res.data ?? [] } : { status: "error", data: [] })
        return res.success
      }),
    [once, workspaceId]
  )

  const loadFields = useCallback(
    (projectId: string, boardId?: string) => {
      if (!projectId) return
      once(`fields:${projectId}:${boardId ?? ""}`, async () => {
        const key = `${projectId}:${boardId ?? ""}`
        setFields((p) => ({ ...p, [key]: { status: "loading", data: [] } }))
        const res = await getCardFieldDefinitionsAction({ projectId, boardId })
        setFields((p) => ({
          ...p,
          [key]: res.success
            ? { status: "ready", data: (res.data ?? []).filter((f) => (f.kind ?? "field") === "field") }
            : { status: "error", data: [] },
        }))
        return res.success
      })
    },
    [once]
  )

  /** Columns of one board (or of the project's only board when `boardId` is empty), merged into the project's cache. */
  const { load: loadColumns } = columnsLoader
  const loadProjectColumns = useCallback(
    (projectId: string, boardId: string | undefined, crmProjects: IProject[]) => void loadColumns(projectId, boardId || undefined, crmProjects),
    [loadColumns]
  )
  const projectColumns = useMemo(() => {
    const out: Record<string, Loadable<IColumn[]>> = {}
    for (const [pid, status] of Object.entries(columnsLoader.status)) out[pid] = { status, data: columnsLoader.columns[pid] ?? [] }
    return out
  }, [columnsLoader.status, columnsLoader.columns])

  const loadLabels = useCallback(
    (projectId: string) => {
      const pid = projectId.trim()
      if (!pid) return
      once(`labels:${pid}`, async () => {
        setLabels((p) => ({ ...p, [pid]: { status: "loading", data: p[pid]?.data ?? [] } }))
        const res = await getLabelsAction(pid)
        setLabels((p) => ({
          ...p,
          [pid]: res.success ? { status: "ready", data: res.data ?? [] } : { status: "error", data: p[pid]?.data ?? [] },
        }))
        return res.success
      })
    },
    [once]
  )

  /** A label created from the picker joins the cached list without a refetch. */
  const addLabel = useCallback((projectId: string, label: ILabel) => {
    setLabels((p) => ({ ...p, [projectId]: { status: "ready", data: [...(p[projectId]?.data ?? []), label] } }))
  }, [])

  // A bot is never offered as its own "go to bot" target. Derived at render, because a new bot gets its id only after the
  // first save, long after the list was cached.
  const bots = useMemo<Loadable<SalesBotListItem[]>>(
    () => (currentBotId ? { ...allBots, data: allBots.data.filter((b) => b.id !== currentBotId) } : allBots),
    [allBots, currentBotId]
  )

  return {
    templates,
    bots,
    users,
    roles,
    fields,
    projectColumns,
    labels,
    loadTemplates,
    loadBots,
    loadUsers,
    loadRoles,
    loadFields,
    loadProjectColumns,
    loadLabels,
    addLabel,
  }
}

export type BotLookups = ReturnType<typeof useBotLookups>
