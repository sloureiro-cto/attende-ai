"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  listInstagramSessionPostsAction,
  type InstagramSessionPost,
} from "actions/instagram-lite/sessions"
import { Checkbox } from "components/Checkbox/Checkbox"
import SelectInput from "components/SelectInput/SelectInput"
import { Input } from "components/ui/input"
import { Label } from "components/ui/label"
import type { WorkspaceSettingsTranslationKey } from "lib/i18n/translations/workspaceSettings"
import { waFieldHintClass, waFieldLabelClass } from "./waSettingsTypography"

const selectTriggerClassNames =
  "w-full min-w-0 max-w-full overflow-hidden rounded-md border border-neutral-50 bg-white font-normal shadow-sm hover:bg-neutral-10"
const selectViewportClassNames =
  "!w-[var(--radix-select-trigger-width)] max-h-[min(280px,50vh)] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"

type TFn = (key: WorkspaceSettingsTranslationKey, replacements?: Record<string, string | number>) => string

export type InstagramPostBrowseSession = {
  _id: string
  label: string
}

export function InstagramCommentPostPicker({
  sessions,
  selectedIds,
  onChange,
  t,
}: {
  sessions: InstagramPostBrowseSession[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  t: TFn
}) {
  const [browseSessionId, setBrowseSessionId] = useState(sessions[0]?._id ?? "")
  const [posts, setPosts] = useState<InstagramSessionPost[]>([])
  const [cursor, setCursor] = useState<string | undefined>()
  const [filter, setFilter] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sessions.some((s) => s._id === browseSessionId)) return
    setBrowseSessionId(sessions[0]?._id ?? "")
  }, [sessions, browseSessionId])

  const load = useCallback(
    async (nextCursor?: string, append = false) => {
      if (!browseSessionId) return
      setLoading(true)
      setError(null)
      try {
        const res = await listInstagramSessionPostsAction(browseSessionId, nextCursor)
        if (!res.success) {
          setError(res.error)
          if (!append) setPosts([])
          return
        }
        setPosts((prev) => (append ? [...prev, ...res.data.posts] : res.data.posts))
        setCursor(res.data.cursor)
      } finally {
        setLoading(false)
      }
    },
    [browseSessionId]
  )

  useEffect(() => {
    void load()
  }, [load])

  const selected = useMemo(() => new Set(selectedIds), [selectedIds])
  const query = filter.trim().toLowerCase()
  const visible = useMemo(() => {
    if (!query) return posts
    return posts.filter((p) => (p.caption || "").toLowerCase().includes(query))
  }, [posts, query])

  const toggle = (id: string) => {
    if (selected.has(id)) onChange(selectedIds.filter((x) => x !== id))
    else onChange([...selectedIds, id])
  }

  if (!browseSessionId) {
    return <p className={waFieldHintClass}>{t("instagramLiteRuleTemplatesSessionsEmpty")}</p>
  }

  return (
    <div className="space-y-2">
      {sessions.length > 1 ? (
        <div className="space-y-1">
          <Label className={waFieldLabelClass}>{t("instagramLiteRuleTemplatesPostsBrowseAccount")}</Label>
          <SelectInput
            size="small"
            inheritTriggerWidth
            portalClassNames="z-[500]"
            value={browseSessionId}
            items={sessions.map((s) => ({ value: s._id, displayName: s.label }))}
            triggerClassNames={selectTriggerClassNames}
            viewportClassNames={selectViewportClassNames}
            onValueChange={(v) => {
              if (!v) return
              setBrowseSessionId(v)
            }}
          />
        </div>
      ) : null}
      <Label className={waFieldLabelClass}>{t("instagramLiteRuleTemplatesPostsFilter")}</Label>
      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="h-8 min-h-8 rounded-md border border-neutral-50 bg-white px-2.5 text-body-12 shadow-sm md:text-body-12"
        placeholder={t("instagramLiteRuleTemplatesPostsFilter")}
      />
      <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-neutral-50 p-1">
        {error ? <p className="px-2 py-3 text-body-12 text-amber-800">{error}</p> : null}
        {!error && visible.length === 0 && !loading ? (
          <p className="px-2 py-3 text-body-12 text-neutral-500">{t("instagramLiteRuleTemplatesPostsEmpty")}</p>
        ) : null}
        {visible.map((post) => (
          <button
            key={post.id}
            type="button"
            onClick={() => toggle(post.id)}
            className="flex w-full items-start gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-neutral-10"
          >
            <Checkbox checked={selected.has(post.id)} className="mt-1 shrink-0" />
            {post.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.thumbnailUrl}
                alt=""
                className="h-12 w-12 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded bg-neutral-50" />
            )}
            <span className="line-clamp-2 min-w-0 flex-1 text-body-12 text-neutral-800">
              {post.caption || post.id}
            </span>
          </button>
        ))}
      </div>
      {cursor ? (
        <button
          type="button"
          className="text-body-12 font-medium text-[#153426]"
          disabled={loading}
          onClick={() => void load(cursor, true)}
        >
          {t("instagramLiteRuleTemplatesPostsLoadMore")}
        </button>
      ) : null}
    </div>
  )
}
