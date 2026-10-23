"use client"

import { ArrowDown2, Mobile, Warning2 } from "iconsax-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useId, useState } from "react"
import { cn } from "@/lib/utils"
import { plural } from "lib/attende/format"
import type { LinesPillAffected } from "lib/bots-app/lines"
import { BOTS_ROUTES } from "./brand"
import { LINE_STATE_KEY, lineHref } from "./lines/lineMeta"
import { useBotsAppT } from "./useBotsAppT"

/**
 * Channels health for the side menu and the phone header. Comes from `getLinesPillStatusAction` (same loader and same
 * mapping as /lines). `affected` lists each channel needing attention once; `offline` is the older count-only shape.
 */
export type LinesStatus =
  | { state: "loading" }
  | { state: "none"; total?: number }
  | { state: "ok"; total: number; connected?: number }
  | { state: "degraded"; total: number; affected?: LinesPillAffected[]; offline?: number }

export type LinesStatusVariant = "sidebar" | "icon"

/** Channels named in the card; the rest are summed up as "N more" and are on /lines. */
const MAX_NAMED = 3

const DOT: Record<LinesStatus["state"], string> = {
  loading: "bg-neutral-100 animate-pulse",
  none: "bg-neutral-200",
  ok: "bg-primary",
  degraded: "bg-warning",
}

const linkClass =
  "rounded font-semibold text-warning-darkest underline underline-offset-2 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"

/**
 * `sidebar`: a quiet row at the foot of the side menu that becomes one warning card (never one per channel) naming
 * the channels that need attention, each linking to its details, with a direct Reconnect when it can be done here.
 * On /lines the page already lists the problems, so the card shrinks to a one-line link (no duplicate alert).
 * `icon`: a round button for the phone header.
 */
export function LinesStatusPill({ status, variant = "sidebar", className }: { status: LinesStatus; variant?: LinesStatusVariant; className?: string }) {
  const { t, language } = useBotsAppT()
  const pathname = usePathname() ?? ""
  const [open, setOpen] = useState(false)
  const detailsId = useId()
  const onLinesPage = pathname === BOTS_ROUTES.lines || pathname.startsWith(`${BOTS_ROUTES.lines}/`)
  const degraded = status.state === "degraded"
  const affected = degraded ? (status.affected ?? []) : []
  const count = degraded ? (status.affected?.length ?? status.offline ?? 0) : 0

  const label =
    status.state === "loading"
      ? t("linesStatusLoading")
      : status.state === "none"
        ? t("linesStatusNone")
        : status.state === "ok"
          ? t("linesStatusAllOnline")
          : plural(count, language, { one: t("linesStatusSomeOne", { total: status.total }), other: t("linesStatusSomeOther", { total: status.total }) })
  const aria = t("linesStatusAriaWith", { status: label })
  const single = affected.length === 1 ? affected[0] : undefined

  if (variant === "icon") {
    return (
      <Link
        href={single ? lineHref(single) : BOTS_ROUTES.lines}
        aria-label={aria}
        title={label}
        className={cn(
          "relative flex size-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
          degraded ? "bg-warning-clean text-warning-darkest" : "text-neutral-500 hover:bg-neutral-10",
          className
        )}
      >
        {degraded ? <Warning2 size={18} aria-hidden /> : <Mobile size={18} aria-hidden />}
        {!degraded && <span className={cn("absolute right-2 top-2 size-2 rounded-full ring-2 ring-white", DOT[status.state])} aria-hidden />}
      </Link>
    )
  }

  if (!degraded && status.state !== "none") return null

  if (!degraded || onLinesPage || affected.length === 0) {
    return (
      <Link
        href={BOTS_ROUTES.lines}
        aria-label={aria}
        className={cn(
          "flex min-h-9 items-center gap-2 rounded-md px-2.5 py-1.5 text-body-13 font-medium no-underline transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
          degraded ? "text-warning-darkest hover:bg-warning-clean" : "text-neutral-500 hover:bg-neutral-10 hover:text-neutral-900",
          className
        )}
      >
        {degraded ? <Warning2 size={14} className="shrink-0" aria-hidden /> : <span className={cn("size-2 shrink-0 rounded-full", DOT[status.state])} aria-hidden />}
        {label}
      </Link>
    )
  }

  const title = single
    ? t("linesStatusChannelState", { name: single.label, state: t(LINE_STATE_KEY[single.status]) })
    : plural(count, language, { one: t("linesStatusAttentionOne"), other: t("linesStatusAttentionOther") })
  const named = affected.slice(0, MAX_NAMED)
  const more = affected.length - named.length

  return (
    <section aria-label={aria} className={cn("rounded-lg bg-warning-clean px-3 py-2 text-body-13 text-warning-darkest", className)}>
      {/* Compact by default: the problem and the fastest fix on one line; names, impact and links behind "Details". */}
      <div className="flex items-start gap-2">
        <Warning2 size={16} className="mt-0.5 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1 font-semibold leading-snug">{title}</p>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((v) => !v)}
          className="-my-0.5 flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-body-12 font-medium hover:bg-warning-lighter/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {open ? t("linesStatusHideDetails") : t("linesStatusShowDetails")}
          <ArrowDown2 size={12} aria-hidden className={cn("transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {single?.reconnectHere && (
        <Link href={lineHref(single, { reconnect: true })} className={cn(linkClass, "ml-6 mt-1 inline-block text-body-12")} aria-label={t("lineReconnectAria", { name: single.label })}>
          {t("lineReconnect")}
        </Link>
      )}
      {/* `hidden` as a class: the `flex` utility would override the attribute. */}
      <div id={detailsId} hidden={!open} className={cn("ml-6 mt-1.5 flex-col gap-1.5", open ? "flex" : "hidden")}>
        {!single && (
          <ul className="flex flex-col gap-1">
            {named.map((line) => (
              <li key={`${line.channel}:${line.id}`} className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                <Link href={lineHref(line)} className={cn(linkClass, "truncate")} aria-label={t("linesStatusOpenAria", { name: line.label })}>
                  {line.label}
                </Link>
                <span className="text-body-12">{t(LINE_STATE_KEY[line.status])}</span>
                {line.reconnectHere && (
                  <Link href={lineHref(line, { reconnect: true })} className={cn(linkClass, "text-body-12")} aria-label={t("lineReconnectAria", { name: line.label })}>
                    {t("lineReconnect")}
                  </Link>
                )}
              </li>
            ))}
            {more > 0 && <li className="text-body-12">{t("linesStatusMore", { count: more })}</li>}
          </ul>
        )}
        <p className="text-body-12 leading-snug">{plural(count, language, { one: t("linesStatusImpactOne"), other: t("linesStatusImpactOther") })}</p>
        <Link href={single ? lineHref(single) : BOTS_ROUTES.lines} className={cn(linkClass, "text-body-12")}>
          {single ? t("linesStatusOpenAria", { name: single.label }) : t("linesStatusSeeAll")}
        </Link>
      </div>
    </section>
  )
}
