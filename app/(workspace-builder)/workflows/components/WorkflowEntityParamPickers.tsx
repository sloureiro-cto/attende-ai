"use client"

import { ArrowDown2, CloseCircle } from "iconsax-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { getAgent } from "actions/agents/getAgent"
import { getAgents } from "actions/agents/getAgents"
import type { AgentConfiguration } from "actions/agents/types"
import { getCardAction } from "actions/cards/getCard"
import { getCardsAction } from "actions/cards/getCards"
import { getEpicAction } from "actions/epics/getEpic"
import { getEpicCardsAction } from "actions/epics/getEpicCards"
import { getEpicsAction } from "actions/epics/getEpics"
import { listInstagramSessionsAction } from "actions/instagram-lite/sessions"
import type { IInstagramSession } from "actions/instagram-lite/types"
import { getProjectAction } from "actions/projects/getProject"
import { getProjectsAction } from "actions/projects/getProjects"
import { listSmsSessionsAction } from "actions/sms-lite/sessions"
import type { ISmsSession } from "actions/sms-lite/types"
import { listWhatsAppConversationsAction } from "actions/whatsapp-lite/conversations"
import { listWhatsAppSessionsAction } from "actions/whatsapp-lite/sessions"
import type { WhatsAppConversation, WhatsAppSession } from "actions/whatsapp-lite/types"
import type { WorkflowBuilderToolItem } from "actions/workflows/workflowBuilderCatalog"
import type { ICard } from "app/_types/Card"
import type { IEpic } from "app/_types/Epic"
import type { ILabel } from "app/_types/Label"
import type { IProject } from "app/_types/Project"
import type { IUser } from "app/_types/User"
import { SearchOption } from "components/SearchPopover/SearchOption"
import { SearchPopover } from "components/SearchPopover/SearchPopover"
import { normalizeBackendEntityId } from "lib/projectAutomations/workflowPlacement"
import { isTemplateValue } from "./workflowParamKeys"
import {
  WF_SEARCH_POPOVER_CLASSNAMES,
  WF_SEARCH_TRIGGER_CLASS,
  WF_SEARCH_TRIGGER_DISABLED_CLASS,
} from "./workflowSearchPopoverStyles"

const NONE = "__wf_entity_none__"

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

export {
  agentParamKey,
  cardParamKey,
  epicParamKey,
  isTemplateValue,
  phoneParamKey,
  projectParamKey,
  sessionParamKey,
} from "./workflowParamKeys"

type PickerLabels = {
  searchPlaceholder: string
  noneLabel: string
  blockedMessage?: string
}

type ProjectPickerProps = {
  value: string
  onChange: (id: string) => void
  labels: PickerLabels
  disabled?: boolean
  /** Pre-loaded project list from parent — avoids per-picker fetch. */
  cachedProjects?: IProject[]
}

export function WorkflowProjectParamPicker({ value, onChange, labels, disabled, cachedProjects }: ProjectPickerProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const debouncedQ = useDebounced(q, 300)
  const [rows, setRows] = useState<IProject[]>(cachedProjects ?? [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (cachedProjects?.length) setRows(cachedProjects)
  }, [cachedProjects])

  const load = useCallback(async (search: string) => {
    setLoading(true)
    try {
      const res = await getProjectsAction({
        title: search.trim() || undefined,
        limit: 40,
        page: 1,
        archieved: false,
      })
      if (res.success && res.data) {
        setRows(res.data)
      } else {
        setRows([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!cachedProjects?.length) void load("")
  }, [load, cachedProjects])

  useEffect(() => {
    if (!open) return
    void load(debouncedQ)
  }, [open, debouncedQ, load])

  useEffect(() => {
    const id = value?.trim()
    if (!id || isTemplateValue(id)) return
    if (rows.some((p) => p._id === id)) return
    let cancelled = false
    void (async () => {
      const res = await getProjectAction({ idOrSlug: id })
      if (cancelled || !res.success || !res.data) return
      const row = res.data
      setRows((prev) => (prev.some((p) => p._id === row._id) ? prev : [row, ...prev]))
    })()
    return () => {
      cancelled = true
    }
  }, [value, rows])

  const options = useMemo(
    () =>
      rows.map((p) => ({
        id: p._id,
        primary: p.title || p._id,
        secondary: p.slug,
      })),
    [rows]
  )

  const sel = options.find((o) => o.id === value)
  const isTemplate = isTemplateValue(value)
  const labelText = isTemplate
    ? value
    : value && !sel
    ? value.length > 24
      ? `${value.slice(0, 12)}…${value.slice(-6)}`
      : value
    : sel?.primary || labels.noneLabel

  const items = useMemo(
    () => [
      <SearchOption key={NONE} value={NONE} className="min-w-0">
        <span className="text-xs font-medium text-neutral-600">{labels.noneLabel}</span>
      </SearchOption>,
      ...options.map((o) => (
        <SearchOption key={o.id} value={o.id} className="min-w-0">
          <div className="flex min-w-0 flex-col gap-0.5 text-left">
            <span className="truncate text-xs font-medium text-neutral-800">{o.primary}</span>
            {o.secondary ? <span className="line-clamp-1 text-[10px] text-neutral-500">{o.secondary}</span> : null}
          </div>
        </SearchOption>
      )),
    ],
    [options, labels.noneLabel]
  )

  return (
    <SearchPopover
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQ("")
      }}
      searchValue={q}
      setSearchValue={setQ}
      value={value || NONE}
      onChange={(v) => {
        if (typeof v !== "string") return
        onChange(v === NONE ? "" : v)
        setOpen(false)
        setQ("")
      }}
      inputPlaceholder={labels.searchPlaceholder}
      items={loading && options.length === 0 ? [] : items}
      emptyContent={<div className="px-3 py-4 text-center text-xs text-neutral-400">{loading ? "…" : "—"}</div>}
      classNames={{
        content: cn("z-[200]", WF_SEARCH_POPOVER_CLASSNAMES.content),
        container: WF_SEARCH_POPOVER_CLASSNAMES.container,
        trigger: WF_SEARCH_POPOVER_CLASSNAMES.trigger,
        inputContainer: WF_SEARCH_POPOVER_CLASSNAMES.inputContainer,
        itemsContainer: WF_SEARCH_POPOVER_CLASSNAMES.itemsContainer,
      }}
    >
      <button
        type="button"
        disabled={disabled}
        className={cn(WF_SEARCH_TRIGGER_CLASS, "disabled:pointer-events-none disabled:opacity-50")}
        aria-haspopup="listbox"
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-left text-xs font-medium",
            isTemplate ? "font-mono text-amber-700" : "text-neutral-800"
          )}
        >
          {labelText}
        </span>
        <ArrowDown2 size={16} variant="Linear" className={cn("shrink-0 text-neutral-600", open && "rotate-180")} />
      </button>
    </SearchPopover>
  )
}

type EpicPickerProps = {
  projectId: string
  value: string
  onChange: (id: string) => void
  labels: PickerLabels
  disabled?: boolean
}

export function WorkflowEpicParamPicker({ projectId, value, onChange, labels, disabled }: EpicPickerProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [rows, setRows] = useState<IEpic[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!projectId || isTemplateValue(projectId)) return
    let cancelled = false
    setLoading(true)
    void (async () => {
      const res = await getEpicsAction({ projectId })
      if (cancelled) return
      if (res.success && res.data) {
        setRows(res.data)
      } else {
        setRows([])
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    const eid = value?.trim()
    if (!eid || !projectId || isTemplateValue(eid) || isTemplateValue(projectId)) return
    let cancelled = false
    void (async () => {
      const res = await getEpicAction({ projectId, epicId: eid })
      if (cancelled || !res.success || !res.data) return
      const row = res.data
      setRows((prev) => (prev.some((e) => e._id === row._id) ? prev : [row, ...prev]))
    })()
    return () => {
      cancelled = true
    }
  }, [value, projectId])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return rows
    return rows.filter(
      (e) => (e.title && e.title.toLowerCase().includes(qq)) || (e._id && e._id.toLowerCase().includes(qq))
    )
  }, [rows, q])

  const options = useMemo(
    () =>
      filtered.map((e) => ({
        id: e._id,
        primary: e.title || e._id,
        secondary: undefined as string | undefined,
      })),
    [filtered]
  )

  const sel = options.find((o) => o.id === value)
  const labelText =
    value && !sel
      ? value.length > 24
        ? `${value.slice(0, 12)}…${value.slice(-6)}`
        : value
      : sel?.primary || labels.noneLabel

  const blocked = !projectId

  const items = useMemo(
    () => [
      <SearchOption key={NONE} value={NONE} className="min-w-0">
        <span className="text-xs font-medium text-neutral-600">{labels.noneLabel}</span>
      </SearchOption>,
      ...options.map((o) => (
        <SearchOption key={o.id} value={o.id} className="min-w-0">
          <span className="truncate text-xs font-medium text-neutral-800">{o.primary}</span>
        </SearchOption>
      )),
    ],
    [options, labels.noneLabel]
  )

  if (blocked) {
    return <div className={WF_SEARCH_TRIGGER_DISABLED_CLASS}>{labels.blockedMessage}</div>
  }

  return (
    <SearchPopover
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQ("")
      }}
      searchValue={q}
      setSearchValue={setQ}
      value={value || NONE}
      onChange={(v) => {
        if (typeof v !== "string") return
        onChange(v === NONE ? "" : v)
        setOpen(false)
        setQ("")
      }}
      inputPlaceholder={labels.searchPlaceholder}
      items={loading && options.length === 0 ? [] : items}
      emptyContent={<div className="px-3 py-4 text-center text-xs text-neutral-400">{loading ? "…" : "—"}</div>}
      classNames={{
        content: cn("z-[200]", WF_SEARCH_POPOVER_CLASSNAMES.content),
        container: WF_SEARCH_POPOVER_CLASSNAMES.container,
        trigger: WF_SEARCH_POPOVER_CLASSNAMES.trigger,
        inputContainer: WF_SEARCH_POPOVER_CLASSNAMES.inputContainer,
        itemsContainer: WF_SEARCH_POPOVER_CLASSNAMES.itemsContainer,
      }}
    >
      <button
        type="button"
        disabled={disabled}
        className={cn(WF_SEARCH_TRIGGER_CLASS, "disabled:pointer-events-none disabled:opacity-50")}
        aria-haspopup="listbox"
      >
        <span className="min-w-0 flex-1 truncate text-left text-xs font-medium text-neutral-800">{labelText}</span>
        <ArrowDown2 size={16} variant="Linear" className={cn("shrink-0 text-neutral-600", open && "rotate-180")} />
      </button>
    </SearchPopover>
  )
}

type CardPickerProps = {
  projectId: string
  /** When set, lists cards under that epic only; when omitted, lists all cards in the project. */
  epicId?: string
  workspaceOwner?: string
  value: string
  onChange: (id: string) => void
  labels: PickerLabels
  disabled?: boolean
}

export function WorkflowCardParamPicker({
  projectId,
  epicId = "",
  workspaceOwner,
  value,
  onChange,
  labels,
  disabled,
}: CardPickerProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [rows, setRows] = useState<ICard[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!projectId || isTemplateValue(projectId)) return
    const epic = epicId?.trim() ?? ""
    if (epic && isTemplateValue(epic)) return
    let cancelled = false
    setLoading(true)
    void (async () => {
      const res = epic
        ? await getEpicCardsAction({ projectId, epicId: epic })
        : await getCardsAction({ projectId, workspaceOwner })
      if (cancelled) return
      if (res.success && res.data) {
        setRows(res.data)
      } else {
        setRows([])
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, epicId, workspaceOwner])

  useEffect(() => {
    const cid = value?.trim()
    if (!cid || !projectId || isTemplateValue(cid) || isTemplateValue(projectId)) return
    let cancelled = false
    void (async () => {
      const res = await getCardAction({ projectId, cardId: cid, workspaceOwner })
      if (cancelled || !res.success || !res.data) return
      const row = res.data
      setRows((prev) => {
        const rid = row._id || ""
        if (!rid || prev.some((c) => (c._id || "") === rid)) return prev
        return [row, ...prev]
      })
    })()
    return () => {
      cancelled = true
    }
  }, [value, projectId, workspaceOwner])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return rows
    return rows.filter((c) => {
      const id = c._id || ""
      const title = (c.title || "").toLowerCase()
      return title.includes(qq) || id.toLowerCase().includes(qq)
    })
  }, [rows, q])

  const options = useMemo(
    () =>
      filtered.map((c) => ({
        id: c._id || "",
        primary: c.title || c._id || "—",
      })),
    [filtered]
  )

  const sel = options.find((o) => o.id && o.id === value)
  const labelText =
    value && !sel
      ? value.length > 24
        ? `${value.slice(0, 12)}…${value.slice(-6)}`
        : value
      : sel?.primary || labels.noneLabel

  const blocked = !projectId

  const items = useMemo(
    () => [
      <SearchOption key={NONE} value={NONE} className="min-w-0">
        <span className="text-xs font-medium text-neutral-600">{labels.noneLabel}</span>
      </SearchOption>,
      ...options
        .filter((o) => o.id)
        .map((o) => (
          <SearchOption key={o.id} value={o.id} className="min-w-0">
            <span className="truncate text-xs font-medium text-neutral-800">{o.primary}</span>
          </SearchOption>
        )),
    ],
    [options, labels.noneLabel]
  )

  if (blocked) {
    return <div className={WF_SEARCH_TRIGGER_DISABLED_CLASS}>{labels.blockedMessage}</div>
  }

  return (
    <SearchPopover
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQ("")
      }}
      searchValue={q}
      setSearchValue={setQ}
      value={value || NONE}
      onChange={(v) => {
        if (typeof v !== "string") return
        onChange(v === NONE ? "" : v)
        setOpen(false)
        setQ("")
      }}
      inputPlaceholder={labels.searchPlaceholder}
      items={loading && options.length === 0 ? [] : items}
      emptyContent={<div className="px-3 py-4 text-center text-xs text-neutral-400">{loading ? "…" : "—"}</div>}
      classNames={{
        content: cn("z-[200]", WF_SEARCH_POPOVER_CLASSNAMES.content),
        container: WF_SEARCH_POPOVER_CLASSNAMES.container,
        trigger: WF_SEARCH_POPOVER_CLASSNAMES.trigger,
        inputContainer: WF_SEARCH_POPOVER_CLASSNAMES.inputContainer,
        itemsContainer: WF_SEARCH_POPOVER_CLASSNAMES.itemsContainer,
      }}
    >
      <button
        type="button"
        disabled={disabled}
        className={cn(WF_SEARCH_TRIGGER_CLASS, "disabled:pointer-events-none disabled:opacity-50")}
        aria-haspopup="listbox"
      >
        <span className="min-w-0 flex-1 truncate text-left text-xs font-medium text-neutral-800">{labelText}</span>
        <ArrowDown2 size={16} variant="Linear" className={cn("shrink-0 text-neutral-600", open && "rotate-180")} />
      </button>
    </SearchPopover>
  )
}

type SessionPickerProps = {
  value: string
  onChange: (id: string) => void
  labels: PickerLabels
  disabled?: boolean
  /** When set, only sessions for this channel (matches CRM message tool `channel`). */
  channelFilter?: "whatsapp_lite" | "sms_lite" | "instagram_lite"
}

type UnifiedSession = { id: string; primary: string; secondary?: string }

export function WorkflowSessionParamPicker({ value, onChange, labels, disabled, channelFilter }: SessionPickerProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [waRows, setWaRows] = useState<WhatsAppSession[]>([])
  const [smsRows, setSmsRows] = useState<ISmsSession[]>([])
  const [igRows, setIgRows] = useState<IInstagramSession[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [waRes, smsRes, igRes] = await Promise.all([
        listWhatsAppSessionsAction(),
        listSmsSessionsAction(),
        listInstagramSessionsAction(),
      ])
      if (waRes.success && waRes.data) setWaRows(waRes.data)
      if (smsRes.success && smsRes.data) setSmsRows(smsRes.data)
      if (igRes.success && igRes.data) setIgRows(igRes.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const options = useMemo<UnifiedSession[]>(() => {
    const wa: UnifiedSession[] = waRows.map((s) => ({
      id: s._id,
      primary: `WhatsApp: ${s.label || s._id}`,
      secondary: s.phoneNumber ?? undefined,
    }))
    const sms: UnifiedSession[] = smsRows.map((s) => ({
      id: s._id,
      primary: `SMS: ${s.label || s._id}`,
      secondary: s.fromNumber ?? undefined,
    }))
    const ig: UnifiedSession[] = igRows.map((s) => ({
      id: s._id,
      primary: `Instagram: ${s.label || s._id}`,
      secondary: s.instagramUsername ?? undefined,
    }))
    if (channelFilter === "whatsapp_lite") return wa
    if (channelFilter === "sms_lite") return sms
    if (channelFilter === "instagram_lite") return ig
    return [...wa, ...sms, ...ig]
  }, [waRows, smsRows, igRows, channelFilter])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return options
    return options.filter(
      (o) =>
        o.primary.toLowerCase().includes(qq) ||
        o.id.toLowerCase().includes(qq) ||
        o.secondary?.toLowerCase().includes(qq)
    )
  }, [options, q])

  const sel = filtered.find((o) => o.id === value) ?? options.find((o) => o.id === value)
  const isTemplate = isTemplateValue(value)
  const labelText = isTemplate
    ? value
    : value && !sel
    ? value.length > 24
      ? `${value.slice(0, 12)}…${value.slice(-6)}`
      : value
    : sel?.primary || labels.noneLabel

  const items = useMemo(
    () => [
      <SearchOption key={NONE} value={NONE} className="min-w-0">
        <span className="text-xs font-medium text-neutral-600">{labels.noneLabel}</span>
      </SearchOption>,
      ...filtered.map((o) => (
        <SearchOption key={o.id} value={o.id} className="min-w-0">
          <div className="flex min-w-0 flex-col gap-0.5 text-left">
            <span className="truncate text-xs font-medium text-neutral-800">{o.primary}</span>
            {o.secondary ? <span className="line-clamp-1 text-[10px] text-neutral-500">{o.secondary}</span> : null}
          </div>
        </SearchOption>
      )),
    ],
    [filtered, labels.noneLabel]
  )

  return (
    <SearchPopover
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQ("")
      }}
      searchValue={q}
      setSearchValue={setQ}
      value={value || NONE}
      onChange={(v) => {
        if (typeof v !== "string") return
        onChange(v === NONE ? "" : v)
        setOpen(false)
        setQ("")
      }}
      inputPlaceholder={labels.searchPlaceholder}
      items={loading && options.length === 0 ? [] : items}
      emptyContent={<div className="px-3 py-4 text-center text-xs text-neutral-400">{loading ? "…" : "—"}</div>}
      classNames={{
        content: cn("z-[200]", WF_SEARCH_POPOVER_CLASSNAMES.content),
        container: WF_SEARCH_POPOVER_CLASSNAMES.container,
        trigger: WF_SEARCH_POPOVER_CLASSNAMES.trigger,
        inputContainer: WF_SEARCH_POPOVER_CLASSNAMES.inputContainer,
        itemsContainer: WF_SEARCH_POPOVER_CLASSNAMES.itemsContainer,
      }}
    >
      <button
        type="button"
        disabled={disabled}
        className={cn(WF_SEARCH_TRIGGER_CLASS, "disabled:pointer-events-none disabled:opacity-50")}
        aria-haspopup="listbox"
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-left text-xs font-medium",
            isTemplate ? "font-mono text-amber-700" : "text-neutral-800"
          )}
        >
          {labelText}
        </span>
        <ArrowDown2 size={16} variant="Linear" className={cn("shrink-0 text-neutral-600", open && "rotate-180")} />
      </button>
    </SearchPopover>
  )
}

type ProjectMemberPickerProps = {
  users: IUser[]
  value: string
  onChange: (id: string) => void
  labels: PickerLabels
  disabled?: boolean
}

/** Single project member / assignee — searchable list (project automations conditions, etc.). */
export function WorkflowProjectMemberParamPicker({
  users,
  value,
  onChange,
  labels,
  disabled,
}: ProjectMemberPickerProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")

  const options = useMemo(() => {
    return users.flatMap((u) => {
      const id = normalizeBackendEntityId(u._id) ?? ""
      if (!id) return []
      const secondary = u.email?.trim()
      return [
        {
          id,
          primary: u.fullName?.trim() || u.name?.trim() || u.username?.trim() || id,
          ...(secondary ? { secondary } : {}),
        },
      ]
    })
  }, [users])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return options
    return options.filter(
      (o) =>
        o.primary.toLowerCase().includes(qq) ||
        o.id.toLowerCase().includes(qq) ||
        o.secondary?.toLowerCase().includes(qq)
    )
  }, [options, q])

  const sel = filtered.find((o) => o.id === value) ?? options.find((o) => o.id === value)
  const isTemplate = isTemplateValue(value)
  const labelText = isTemplate
    ? value
    : value && !sel
    ? value.length > 24
      ? `${value.slice(0, 12)}…${value.slice(-6)}`
      : value
    : sel?.primary || labels.noneLabel

  const items = useMemo(
    () => [
      <SearchOption key={NONE} value={NONE} className="min-w-0">
        <span className="text-xs font-medium text-neutral-600">{labels.noneLabel}</span>
      </SearchOption>,
      ...filtered.map((o) => (
        <SearchOption key={o.id} value={o.id} className="min-w-0">
          <div className="flex min-w-0 flex-col gap-0.5 text-left">
            <span className="truncate text-xs font-medium text-neutral-800">{o.primary}</span>
            {o.secondary ? <span className="line-clamp-1 text-[10px] text-neutral-500">{o.secondary}</span> : null}
          </div>
        </SearchOption>
      )),
    ],
    [filtered, labels.noneLabel]
  )

  if (users.length === 0) {
    return (
      <div className={cn(WF_SEARCH_TRIGGER_DISABLED_CLASS, "items-center py-2")}>{labels.blockedMessage ?? "—"}</div>
    )
  }

  return (
    <SearchPopover
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQ("")
      }}
      searchValue={q}
      setSearchValue={setQ}
      value={value || NONE}
      onChange={(v) => {
        if (typeof v !== "string") return
        onChange(v === NONE ? "" : v)
        setOpen(false)
        setQ("")
      }}
      inputPlaceholder={labels.searchPlaceholder}
      items={items}
      emptyContent={<div className="px-3 py-4 text-center text-xs text-neutral-400">{labels.noneLabel}</div>}
      classNames={{
        content: cn("z-[200]", WF_SEARCH_POPOVER_CLASSNAMES.content),
        container: WF_SEARCH_POPOVER_CLASSNAMES.container,
        trigger: WF_SEARCH_POPOVER_CLASSNAMES.trigger,
        inputContainer: WF_SEARCH_POPOVER_CLASSNAMES.inputContainer,
        itemsContainer: WF_SEARCH_POPOVER_CLASSNAMES.itemsContainer,
      }}
    >
      <button
        type="button"
        disabled={disabled}
        className={cn(WF_SEARCH_TRIGGER_CLASS, "disabled:pointer-events-none disabled:opacity-50")}
        aria-haspopup="listbox"
      >
        <span className="min-w-0 flex-1 truncate text-left text-xs font-medium text-neutral-800">{labelText}</span>
        <ArrowDown2 size={16} variant="Linear" className={cn("shrink-0 text-neutral-600", open && "rotate-180")} />
      </button>
    </SearchPopover>
  )
}

type ProjectMemberMultiPickerProps = {
  users: IUser[]
  /** Comma-separated user ids */
  value: string
  onChange: (csv: string) => void
  labels: PickerLabels
  disabled?: boolean
}

/** Multiple assignees for workflow condition rules (comma-separated ids). */
export function WorkflowProjectMemberMultiParamPicker({
  users,
  value,
  onChange,
  labels,
  disabled,
}: ProjectMemberMultiPickerProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")

  const ids = useMemo(
    () =>
      value
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [value]
  )
  const idSet = useMemo(() => new Set(ids), [ids])

  const options = useMemo(() => {
    return users.flatMap((u) => {
      const id = normalizeBackendEntityId(u._id) ?? ""
      if (!id) return []
      const secondary = u.email?.trim()
      return [
        {
          id,
          primary: u.fullName?.trim() || u.name?.trim() || u.username?.trim() || id,
          ...(secondary ? { secondary } : {}),
        },
      ]
    })
  }, [users])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    const base = !qq
      ? options
      : options.filter(
          (o) =>
            o.primary.toLowerCase().includes(qq) ||
            o.id.toLowerCase().includes(qq) ||
            o.secondary?.toLowerCase().includes(qq)
        )
    return base.filter((o) => !idSet.has(o.id))
  }, [options, q, idSet])

  const remove = (id: string) => {
    onChange(ids.filter((i) => i !== id).join(", "))
  }

  const append = (id: string) => {
    if (!id || idSet.has(id)) return
    onChange([...ids, id].join(", "))
    setOpen(false)
    setQ("")
  }

  const items = useMemo(
    () => [
      <SearchOption key={NONE} value={NONE} className="min-w-0">
        <span className="text-xs font-medium text-neutral-600">{labels.noneLabel}</span>
      </SearchOption>,
      ...filtered.map((o) => (
        <SearchOption key={o.id} value={o.id} className="min-w-0">
          <div className="flex min-w-0 flex-col gap-0.5 text-left">
            <span className="truncate text-xs font-medium text-neutral-800">{o.primary}</span>
            {o.secondary ? <span className="line-clamp-1 text-[10px] text-neutral-500">{o.secondary}</span> : null}
          </div>
        </SearchOption>
      )),
    ],
    [filtered, labels.noneLabel]
  )

  if (users.length === 0) {
    return (
      <div className={cn(WF_SEARCH_TRIGGER_DISABLED_CLASS, "items-center py-2")}>{labels.blockedMessage ?? "—"}</div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {ids.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {ids.map((id) => {
            const o = options.find((x) => x.id === id)
            const label = o?.primary ?? (id.length > 20 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id)
            return (
              <span
                key={id}
                className="inline-flex max-w-full items-center gap-1 rounded-md border border-neutral-100 bg-neutral-10 px-2 py-0.5 text-left text-[11px] font-medium text-neutral-800"
              >
                <span className="min-w-0 truncate">{label}</span>
                <button
                  type="button"
                  className="shrink-0 text-neutral-500 hover:text-red-600 disabled:opacity-50"
                  disabled={disabled}
                  aria-label="Remove"
                  onClick={() => remove(id)}
                >
                  <CloseCircle size={14} variant="Linear" />
                </button>
              </span>
            )
          })}
        </div>
      ) : null}
      <SearchPopover
        modal={false}
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setQ("")
        }}
        searchValue={q}
        setSearchValue={setQ}
        value={NONE}
        onChange={(v) => {
          if (typeof v !== "string" || v === NONE) return
          append(v)
        }}
        inputPlaceholder={labels.searchPlaceholder}
        items={items}
        emptyContent={<div className="px-3 py-4 text-center text-xs text-neutral-400">{labels.noneLabel}</div>}
        classNames={{
          content: cn("z-[200]", WF_SEARCH_POPOVER_CLASSNAMES.content),
          container: WF_SEARCH_POPOVER_CLASSNAMES.container,
          trigger: WF_SEARCH_POPOVER_CLASSNAMES.trigger,
          inputContainer: WF_SEARCH_POPOVER_CLASSNAMES.inputContainer,
          itemsContainer: WF_SEARCH_POPOVER_CLASSNAMES.itemsContainer,
        }}
      >
        <button
          type="button"
          disabled={disabled}
          className={cn(WF_SEARCH_TRIGGER_CLASS, "disabled:pointer-events-none disabled:opacity-50")}
          aria-haspopup="listbox"
        >
          <span className="min-w-0 flex-1 truncate text-left text-xs font-medium text-neutral-700">
            {labels.searchPlaceholder}
          </span>
          <ArrowDown2 size={16} variant="Linear" className={cn("shrink-0 text-neutral-600", open && "rotate-180")} />
        </button>
      </SearchPopover>
    </div>
  )
}

type LabelsMultiPickerProps = {
  /** CRM labels for this project */
  projectLabels: ILabel[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  pickerLabels: PickerLabels
  disabled?: boolean
}

/** Multiple CRM labels for automations / workflow rules (by id). */
export function WorkflowLabelsMultiParamPicker({
  projectLabels,
  selectedIds,
  onChange,
  pickerLabels,
  disabled,
}: LabelsMultiPickerProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")

  const idSet = useMemo(() => new Set(selectedIds.filter(Boolean)), [selectedIds])

  const options = useMemo(() => {
    return projectLabels
      .map((lb) => {
        const id = normalizeBackendEntityId(lb._id) ?? ""
        if (!id) return null
        const text = lb.text?.trim() || id
        const color = typeof lb.color === "string" ? lb.color : "#94a3b8"
        return { id, primary: text, color }
      })
      .filter((o): o is { id: string; primary: string; color: string } => o != null)
  }, [projectLabels])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    const base = !qq
      ? options
      : options.filter((o) => o.primary.toLowerCase().includes(qq) || o.id.toLowerCase().includes(qq))
    return base.filter((o) => !idSet.has(o.id))
  }, [options, q, idSet])

  const remove = (id: string) => {
    onChange(selectedIds.filter((i) => i !== id))
  }

  const append = (id: string) => {
    if (!id || idSet.has(id)) return
    onChange([...selectedIds, id])
    setOpen(false)
    setQ("")
  }

  const items = useMemo(
    () => [
      <SearchOption key={NONE} value={NONE} className="min-w-0">
        <span className="text-xs font-medium text-neutral-600">{pickerLabels.noneLabel}</span>
      </SearchOption>,
      ...filtered.map((o) => (
        <SearchOption key={o.id} value={o.id} className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 text-left">
            <span
              className="size-2.5 shrink-0 rounded-full border border-neutral-200"
              style={{ backgroundColor: o.color }}
              aria-hidden
            />
            <span className="truncate text-xs font-medium text-neutral-800">{o.primary}</span>
          </div>
        </SearchOption>
      )),
    ],
    [filtered, pickerLabels.noneLabel]
  )

  if (options.length === 0) {
    return (
      <div className={cn(WF_SEARCH_TRIGGER_DISABLED_CLASS, "items-center py-2")}>
        {pickerLabels.blockedMessage ?? "—"}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selectedIds.map((id) => {
            const o = options.find((x) => x.id === id)
            const label = o?.primary ?? (id.length > 20 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id)
            const dotColor = o?.color ?? "#94a3b8"
            return (
              <span
                key={id}
                className="inline-flex max-w-full items-center gap-1 rounded-md border border-neutral-100 bg-neutral-10 px-2 py-0.5 text-left text-[11px] font-medium text-neutral-800"
              >
                <span
                  className="size-2 shrink-0 rounded-full border border-neutral-200"
                  style={{ backgroundColor: dotColor }}
                  aria-hidden
                />
                <span className="min-w-0 truncate">{label}</span>
                <button
                  type="button"
                  className="shrink-0 text-neutral-400 hover:text-neutral-700"
                  aria-label="Remove"
                  onClick={() => remove(id)}
                >
                  <CloseCircle size={14} variant="Linear" />
                </button>
              </span>
            )
          })}
        </div>
      ) : null}
      <SearchPopover
        modal={false}
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setQ("")
        }}
        searchValue={q}
        setSearchValue={setQ}
        value={NONE}
        onChange={(v) => {
          if (typeof v !== "string" || v === NONE) return
          append(v)
        }}
        inputPlaceholder={pickerLabels.searchPlaceholder}
        items={items}
        emptyContent={<div className="px-3 py-4 text-center text-xs text-neutral-400">{pickerLabels.noneLabel}</div>}
        classNames={{
          content: cn("z-[200]", WF_SEARCH_POPOVER_CLASSNAMES.content),
          container: WF_SEARCH_POPOVER_CLASSNAMES.container,
          trigger: WF_SEARCH_POPOVER_CLASSNAMES.trigger,
          inputContainer: WF_SEARCH_POPOVER_CLASSNAMES.inputContainer,
          itemsContainer: WF_SEARCH_POPOVER_CLASSNAMES.itemsContainer,
        }}
      >
        <button
          type="button"
          disabled={disabled}
          className={cn(WF_SEARCH_TRIGGER_CLASS, "disabled:pointer-events-none disabled:opacity-50")}
          aria-haspopup="listbox"
        >
          <span className="min-w-0 flex-1 truncate text-left text-xs font-medium text-neutral-700">
            {pickerLabels.searchPlaceholder}
          </span>
          <ArrowDown2 size={16} variant="Linear" className={cn("shrink-0 text-neutral-600", open && "rotate-180")} />
        </button>
      </SearchPopover>
    </div>
  )
}

type CatalogToolPickerProps = {
  tools: WorkflowBuilderToolItem[]
  value: string
  onChange: (toolId: string) => void
  labels: PickerLabels
  disabled?: boolean
}

/** Searchable workflow builder tool (for agent / generic tool steps). */
export function WorkflowCatalogToolParamPicker({ tools, value, onChange, labels, disabled }: CatalogToolPickerProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return tools.slice(0, 120)
    return tools
      .filter((t) => {
        const hay = `${t.displayName} ${t.toolName} ${t.toolId} ${t.category ?? ""} ${t.provider ?? ""}`.toLowerCase()
        return hay.includes(qq)
      })
      .slice(0, 120)
  }, [tools, q])

  const sel = tools.find((t) => t.toolId === value)
  const labelText = sel ? sel.displayName?.trim() || sel.toolName || sel.toolId : value ? value : labels.noneLabel

  const items = useMemo(
    () => [
      <SearchOption key={NONE} value={NONE} className="min-w-0">
        <span className="text-xs font-medium text-neutral-600">{labels.noneLabel}</span>
      </SearchOption>,
      ...filtered.map((t) => (
        <SearchOption key={t.toolId} value={t.toolId} className="min-w-0">
          <div className="flex min-w-0 flex-col gap-0.5 text-left">
            <span className="truncate text-xs font-medium text-neutral-800">
              {t.displayName?.trim() || t.toolName || t.toolId}
            </span>
            <span className="line-clamp-1 text-[10px] text-neutral-500">
              {[t.category, t.provider].filter(Boolean).join(" · ")} · {t.toolId}
            </span>
          </div>
        </SearchOption>
      )),
    ],
    [filtered, labels.noneLabel]
  )

  return (
    <SearchPopover
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQ("")
      }}
      searchValue={q}
      setSearchValue={setQ}
      value={value || NONE}
      onChange={(v) => {
        if (typeof v !== "string") return
        onChange(v === NONE ? "" : v)
        setOpen(false)
        setQ("")
      }}
      inputPlaceholder={labels.searchPlaceholder}
      items={items}
      emptyContent={<div className="px-3 py-4 text-center text-xs text-neutral-400">{labels.noneLabel}</div>}
      classNames={{
        content: cn("z-[200]", WF_SEARCH_POPOVER_CLASSNAMES.content),
        container: WF_SEARCH_POPOVER_CLASSNAMES.container,
        trigger: WF_SEARCH_POPOVER_CLASSNAMES.trigger,
        inputContainer: WF_SEARCH_POPOVER_CLASSNAMES.inputContainer,
        itemsContainer: WF_SEARCH_POPOVER_CLASSNAMES.itemsContainer,
      }}
    >
      <button
        type="button"
        disabled={disabled}
        className={cn(WF_SEARCH_TRIGGER_CLASS, "disabled:pointer-events-none disabled:opacity-50")}
        aria-haspopup="listbox"
      >
        <span className="min-w-0 flex-1 truncate text-left text-xs font-medium text-neutral-800">{labelText}</span>
        <ArrowDown2 size={16} variant="Linear" className={cn("shrink-0 text-neutral-600", open && "rotate-180")} />
      </button>
    </SearchPopover>
  )
}

type AgentPickerProps = {
  workspaceId: string
  value: string
  onChange: (id: string) => void
  labels: PickerLabels
  disabled?: boolean
  /** Pre-loaded agent list from parent — avoids per-picker fetch. */
  cachedAgents?: AgentConfiguration[]
}

export function WorkflowAgentParamPicker({
  workspaceId,
  value,
  onChange,
  labels,
  disabled,
  cachedAgents,
}: AgentPickerProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const debouncedQ = useDebounced(q, 300)
  const [rows, setRows] = useState<AgentConfiguration[]>(cachedAgents ?? [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (cachedAgents?.length) setRows(cachedAgents)
  }, [cachedAgents])

  const load = useCallback(
    async (search: string) => {
      if (!workspaceId) return
      setLoading(true)
      try {
        const res = await getAgents(workspaceId, { search: search.trim() || undefined, limit: 60 })
        if (res.success && res.data) {
          setRows(res.data)
        } else {
          setRows([])
        }
      } finally {
        setLoading(false)
      }
    },
    [workspaceId]
  )

  useEffect(() => {
    if (!cachedAgents?.length && workspaceId) void load("")
  }, [load, workspaceId, cachedAgents])

  useEffect(() => {
    if (!open || !workspaceId) return
    void load(debouncedQ)
  }, [open, debouncedQ, load, workspaceId])

  useEffect(() => {
    const aid = value?.trim()
    if (!aid || !workspaceId || isTemplateValue(aid)) return
    if (rows.some((a) => a._id === aid)) return
    let cancelled = false
    void (async () => {
      const res = await getAgent(workspaceId, aid)
      if (cancelled || !res.success || !res.data) return
      const row = res.data
      setRows((prev) => (prev.some((a) => a._id === row._id) ? prev : [row, ...prev]))
    })()
    return () => {
      cancelled = true
    }
  }, [value, workspaceId])

  const options = useMemo(
    () =>
      rows.map((a) => ({
        id: a._id,
        primary: a.name?.trim() || a._id,
        secondary: a.description?.trim() || undefined,
      })),
    [rows]
  )

  const sel = options.find((o) => o.id === value)
  const labelText =
    value && !sel
      ? value.length > 24
        ? `${value.slice(0, 12)}…${value.slice(-6)}`
        : value
      : sel?.primary || labels.noneLabel

  const blocked = !workspaceId

  const items = useMemo(
    () => [
      <SearchOption key={NONE} value={NONE} className="min-w-0">
        <span className="text-xs font-medium text-neutral-600">{labels.noneLabel}</span>
      </SearchOption>,
      ...options.map((o) => (
        <SearchOption key={o.id} value={o.id} className="min-w-0">
          <div className="flex min-w-0 flex-col gap-0.5 text-left">
            <span className="truncate text-xs font-medium text-neutral-800">{o.primary}</span>
            {o.secondary ? <span className="line-clamp-1 text-[10px] text-neutral-500">{o.secondary}</span> : null}
          </div>
        </SearchOption>
      )),
    ],
    [options, labels.noneLabel]
  )

  if (blocked) {
    return <div className={WF_SEARCH_TRIGGER_DISABLED_CLASS}>{labels.blockedMessage}</div>
  }

  return (
    <SearchPopover
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQ("")
      }}
      searchValue={q}
      setSearchValue={setQ}
      value={value || NONE}
      onChange={(v) => {
        if (typeof v !== "string") return
        onChange(v === NONE ? "" : v)
        setOpen(false)
        setQ("")
      }}
      inputPlaceholder={labels.searchPlaceholder}
      items={loading && options.length === 0 ? [] : items}
      emptyContent={<div className="px-3 py-4 text-center text-xs text-neutral-400">{loading ? "…" : "—"}</div>}
      classNames={{
        content: cn("z-[200]", WF_SEARCH_POPOVER_CLASSNAMES.content),
        container: WF_SEARCH_POPOVER_CLASSNAMES.container,
        trigger: WF_SEARCH_POPOVER_CLASSNAMES.trigger,
        inputContainer: WF_SEARCH_POPOVER_CLASSNAMES.inputContainer,
        itemsContainer: WF_SEARCH_POPOVER_CLASSNAMES.itemsContainer,
      }}
    >
      <button
        type="button"
        disabled={disabled}
        className={cn(WF_SEARCH_TRIGGER_CLASS, "disabled:pointer-events-none disabled:opacity-50")}
        aria-haspopup="listbox"
      >
        <span className="min-w-0 flex-1 truncate text-left text-xs font-medium text-neutral-800">{labelText}</span>
        <ArrowDown2 size={16} variant="Linear" className={cn("shrink-0 text-neutral-600", open && "rotate-180")} />
      </button>
    </SearchPopover>
  )
}

/* ─── WhatsApp conversation picker (for whatsapp_lite_send_message) ───────── */

type ConversationPickerProps = {
  sessionId: string
  value: string
  onChange: (id: string) => void
  labels: { searchPlaceholder: string; noneLabel: string; blockedMessage?: string }
  disabled?: boolean
  /** When set, only list conversations of this chat type (e.g. group for outbound automations). */
  chatType?: "direct" | "group"
}

export function WorkflowConversationParamPicker({
  sessionId,
  value,
  onChange,
  labels,
  disabled,
  chatType,
}: ConversationPickerProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [rows, setRows] = useState<WhatsAppConversation[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const res = await listWhatsAppConversationsAction(sessionId, {
        limit: 50,
        ...(chatType ? { chatType } : {}),
      })
      if (res.success && res.data) setRows(res.data)
    } finally {
      setLoading(false)
    }
  }, [sessionId, chatType])

  useEffect(() => {
    if (sessionId) void load()
  }, [load, sessionId])

  const options = useMemo(
    () =>
      rows.map((c) => ({
        id: c._id,
        primary: c.contactName?.trim() || c.groupSubject?.trim() || c.contactPhone || c.remoteJid || c._id,
        secondary: c.contactPhone ?? undefined,
      })),
    [rows]
  )

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return options
    return options.filter(
      (o) =>
        o.primary.toLowerCase().includes(qq) ||
        o.id.toLowerCase().includes(qq) ||
        o.secondary?.toLowerCase().includes(qq)
    )
  }, [options, q])

  const sel = filtered.find((o) => o.id === value) ?? options.find((o) => o.id === value)
  const isTemplate = isTemplateValue(value)
  const labelText = isTemplate
    ? value
    : value && !sel
    ? value.length > 24
      ? `${value.slice(0, 12)}…${value.slice(-6)}`
      : value
    : sel?.primary || labels.noneLabel

  const blocked = !sessionId

  const items = useMemo(
    () => [
      <SearchOption key={NONE} value={NONE} className="min-w-0">
        <span className="text-xs font-medium text-neutral-600">{labels.noneLabel}</span>
      </SearchOption>,
      ...filtered.map((o) => (
        <SearchOption key={o.id} value={o.id} className="min-w-0">
          <div className="flex min-w-0 flex-col gap-0.5 text-left">
            <span className="truncate text-xs font-medium text-neutral-800">{o.primary}</span>
            {o.secondary ? <span className="line-clamp-1 text-[10px] text-neutral-500">{o.secondary}</span> : null}
          </div>
        </SearchOption>
      )),
    ],
    [filtered, labels.noneLabel]
  )

  if (blocked) {
    return <div className={WF_SEARCH_TRIGGER_DISABLED_CLASS}>{labels.blockedMessage || labels.noneLabel}</div>
  }

  return (
    <SearchPopover
      modal={false}
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQ("")
      }}
      searchValue={q}
      setSearchValue={setQ}
      value={value || NONE}
      onChange={(v) => {
        if (typeof v !== "string") return
        onChange(v === NONE ? "" : v)
        setOpen(false)
        setQ("")
      }}
      inputPlaceholder={labels.searchPlaceholder}
      items={loading && options.length === 0 ? [] : items}
      emptyContent={<div className="px-3 py-4 text-center text-xs text-neutral-400">{loading ? "…" : "—"}</div>}
      classNames={{
        content: cn("z-[200]", WF_SEARCH_POPOVER_CLASSNAMES.content),
        container: WF_SEARCH_POPOVER_CLASSNAMES.container,
        trigger: WF_SEARCH_POPOVER_CLASSNAMES.trigger,
        inputContainer: WF_SEARCH_POPOVER_CLASSNAMES.inputContainer,
        itemsContainer: WF_SEARCH_POPOVER_CLASSNAMES.itemsContainer,
      }}
    >
      <button
        type="button"
        disabled={disabled}
        className={cn(WF_SEARCH_TRIGGER_CLASS, "disabled:pointer-events-none disabled:opacity-50")}
        aria-haspopup="listbox"
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-left text-xs font-medium",
            isTemplate ? "font-mono text-amber-700" : "text-neutral-800"
          )}
        >
          {labelText}
        </span>
        <ArrowDown2 size={16} variant="Linear" className={cn("shrink-0 text-neutral-600", open && "rotate-180")} />
      </button>
    </SearchPopover>
  )
}

/* ─── WhatsApp conversation multi-picker (one or more groups) ─────────────── */

type ConversationMultiPickerProps = {
  sessionId: string
  /** Comma-separated conversation ids — same CSV convention as the other multi pickers in this file. */
  value: string
  onChange: (csv: string) => void
  labels: { searchPlaceholder: string; noneLabel: string; blockedMessage?: string }
  disabled?: boolean
  /** When set, only list conversations of this chat type (e.g. group for outbound automations). */
  chatType?: "direct" | "group"
}

export function WorkflowConversationMultiParamPicker({
  sessionId,
  value,
  onChange,
  labels,
  disabled,
  chatType,
}: ConversationMultiPickerProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [rows, setRows] = useState<WhatsAppConversation[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const res = await listWhatsAppConversationsAction(sessionId, {
        limit: 50,
        ...(chatType ? { chatType } : {}),
      })
      if (res.success && res.data) setRows(res.data)
    } finally {
      setLoading(false)
    }
  }, [sessionId, chatType])

  useEffect(() => {
    if (sessionId) void load()
  }, [load, sessionId])

  const ids = useMemo(
    () =>
      value
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [value]
  )
  const idSet = useMemo(() => new Set(ids), [ids])

  const options = useMemo(
    () =>
      rows.map((c) => ({
        id: c._id,
        primary: c.contactName?.trim() || c.groupSubject?.trim() || c.contactPhone || c.remoteJid || c._id,
        secondary: c.contactPhone ?? undefined,
      })),
    [rows]
  )

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    const base = !qq
      ? options
      : options.filter(
          (o) =>
            o.primary.toLowerCase().includes(qq) ||
            o.id.toLowerCase().includes(qq) ||
            o.secondary?.toLowerCase().includes(qq)
        )
    return base.filter((o) => !idSet.has(o.id))
  }, [options, q, idSet])

  const remove = (id: string) => {
    onChange(ids.filter((i) => i !== id).join(", "))
  }

  const append = (id: string) => {
    if (!id || idSet.has(id)) return
    onChange([...ids, id].join(", "))
    setOpen(false)
    setQ("")
  }

  const blocked = !sessionId

  const items = useMemo(
    () => [
      <SearchOption key={NONE} value={NONE} className="min-w-0">
        <span className="text-xs font-medium text-neutral-600">{labels.noneLabel}</span>
      </SearchOption>,
      ...filtered.map((o) => (
        <SearchOption key={o.id} value={o.id} className="min-w-0">
          <div className="flex min-w-0 flex-col gap-0.5 text-left">
            <span className="truncate text-xs font-medium text-neutral-800">{o.primary}</span>
            {o.secondary ? <span className="line-clamp-1 text-[10px] text-neutral-500">{o.secondary}</span> : null}
          </div>
        </SearchOption>
      )),
    ],
    [filtered, labels.noneLabel]
  )

  if (blocked) {
    return <div className={WF_SEARCH_TRIGGER_DISABLED_CLASS}>{labels.blockedMessage || labels.noneLabel}</div>
  }

  return (
    <div className="flex flex-col gap-2">
      {ids.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {ids.map((id) => {
            const o = options.find((x) => x.id === id)
            const label = o?.primary ?? (id.length > 20 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id)
            return (
              <span
                key={id}
                className="inline-flex max-w-full items-center gap-1 rounded-md border border-neutral-100 bg-neutral-10 px-2 py-0.5 text-left text-[11px] font-medium text-neutral-800"
              >
                <span className="min-w-0 truncate">{label}</span>
                <button
                  type="button"
                  className="shrink-0 text-neutral-500 hover:text-red-600 disabled:opacity-50"
                  disabled={disabled}
                  aria-label="Remove"
                  onClick={() => remove(id)}
                >
                  <CloseCircle size={14} variant="Linear" />
                </button>
              </span>
            )
          })}
        </div>
      ) : null}
      <SearchPopover
        modal={false}
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setQ("")
        }}
        searchValue={q}
        setSearchValue={setQ}
        value={NONE}
        onChange={(v) => {
          if (typeof v !== "string" || v === NONE) return
          append(v)
        }}
        inputPlaceholder={labels.searchPlaceholder}
        items={loading && filtered.length === 0 ? [] : items}
        emptyContent={
          <div className="px-3 py-4 text-center text-xs text-neutral-400">{loading ? "…" : labels.noneLabel}</div>
        }
        classNames={{
          content: cn("z-[200]", WF_SEARCH_POPOVER_CLASSNAMES.content),
          container: WF_SEARCH_POPOVER_CLASSNAMES.container,
          trigger: WF_SEARCH_POPOVER_CLASSNAMES.trigger,
          inputContainer: WF_SEARCH_POPOVER_CLASSNAMES.inputContainer,
          itemsContainer: WF_SEARCH_POPOVER_CLASSNAMES.itemsContainer,
        }}
      >
        <button
          type="button"
          disabled={disabled}
          className={cn(WF_SEARCH_TRIGGER_CLASS, "disabled:pointer-events-none disabled:opacity-50")}
          aria-haspopup="listbox"
        >
          <span className="min-w-0 flex-1 truncate text-left text-xs font-medium text-neutral-700">
            {labels.searchPlaceholder}
          </span>
          <ArrowDown2 size={16} variant="Linear" className={cn("shrink-0 text-neutral-600", open && "rotate-180")} />
        </button>
      </SearchPopover>
    </div>
  )
}
