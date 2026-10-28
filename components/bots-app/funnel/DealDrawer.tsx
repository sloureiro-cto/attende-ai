"use client"

import { CloseSquare, Edit2, MessageText1 } from "iconsax-react"
import Link from "next/link"
import { type FormEvent, type ReactNode, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { type FunnelOption, loadFunnelDealConversationAction, updateFunnelDealAction } from "actions/attende/funnel"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "components/ui/sheet"
import { formatDateTime } from "lib/attende/format"
import { type ContactDraft, type DealPatch, type DealRef, parseMoneyInput } from "lib/attende/funnel/deal"
import { formatDealValue, formatRelativeTime, lacksPhoneAndEmail, moneyInputText } from "lib/attende/funnel/model"
import { stageLabel } from "lib/attende/funnel/stageNames"
import type { FunnelRow, FunnelStageWithCount } from "lib/attende/funnel/types"
import { Avatar, CHANNEL_KEY, HANDLING_KEY, LabelPill, safeColor, StageBadge } from "./atoms"
import { DealAttachments } from "./DealAttachments"
import { DealChecklist } from "./DealChecklist"
import { DealComments } from "./DealComments"
import { DealContactForm } from "./DealContactForm"
import { rowAvatarName, rowName } from "./DealsTable"
import { FormField, IconAction, Input, Section } from "./fields"
import { Picker, type PickerOption } from "./Picker"
import type { AttendeFunnelT } from "./useAttendeFunnelT"
import { BOTS_ROUTES } from "../brand"
import { actionClass } from "../ui/actionStyles"

export type MoveFeedback = { cardId: string; kind: "ok" | "error"; text: string } | null

const NO_OWNER = "__none__"

type Props = {
  /** Card id whose drawer is open (`?deal=`), `null` when closed. */
  dealId: string | null
  /** The loaded row for `dealId`; `null` when it is not in the loaded pages. */
  row: FunnelRow | null
  stages: FunnelStageWithCount[]
  /** Project and board of the funnel (checklist and comments need them); `null` hides those sections. */
  board: { id: string; projectId: string | null } | null
  owners: FunnelOption[]
  labels: FunnelOption[]
  moving: boolean
  feedback: MoveFeedback
  canLoadMore: boolean
  loadingMore: boolean
  t: AttendeFunnelT
  language: string
  now?: Date
  onClose: () => void
  onMove: (cardId: string, stageId: string) => void
  onLoadMore: () => void
  /** Shows a change on the row right away (and again with the old values to roll back). */
  onPatchRow: (cardId: string, patch: Partial<FunnelRow>) => void
  onContactSaved: (contactId: string, draft: ContactDraft) => void
}

export function inboxHref(conversation: NonNullable<FunnelRow["conversation"]>): string {
  const params = new URLSearchParams({ channel: conversation.channel })
  if (conversation.sessionId) params.set("sessionId", conversation.sessionId)
  return `${BOTS_ROUTES.inbox}/${encodeURIComponent(conversation.id)}?${params.toString()}`
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
      <dt className="text-body-13 text-neutral-500">{label}</dt>
      <dd className="min-w-0 text-body-13 text-neutral-900">{children}</dd>
    </div>
  )
}

/**
 * The currency a value is edited in: the deal's own. A deal without a value has none yet; the backend reads a value
 * saved without a currency as USD (same default as the CRM dashboard), so that is what the label says.
 */
export const editCurrency = (row: FunnelRow): string => row.deal?.currency || "USD"

/** The value as text: in the deal's own currency, or "No value" (never a zero) when it has none. */
function DealValue({ row, t, language }: { row: FunnelRow; t: AttendeFunnelT; language: string }) {
  const value = formatDealValue(row.deal, language)
  return <span className={cn("truncate tabular-nums", !value && "text-neutral-500")}>{value ?? t("dealNoValue")}</span>
}

/** Inline edit of the deal value (the CRM's estimated revenue). */
function ValueEditor({ row, t, language, onSave }: { row: FunnelRow; t: AttendeFunnelT; language: string; onSave: (value: number) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState("")
  const [invalid, setInvalid] = useState(false)
  const [saving, setSaving] = useState(false)
  const currency = editCurrency(row)

  const start = () => {
    setText(row.deal ? moneyInputText(row.deal.value, language) : "")
    setInvalid(false)
    setEditing(true)
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const value = parseMoneyInput(text)
    if (value === null) {
      setInvalid(true)
      return
    }
    setSaving(true)
    const ok = await onSave(value)
    setSaving(false)
    if (ok) setEditing(false)
  }

  if (!editing) {
    return (
      <span className="flex min-w-0 items-center justify-between gap-2">
        <DealValue row={row} t={t} language={language} />
        <IconAction label={t("dealValueEdit")} onClick={start}>
          <Edit2 size={15} aria-hidden />
        </IconAction>
      </span>
    )
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
      <FormField id="funnel-deal-value" label={t("dealValueLabel", { currency })} error={invalid ? t("dealValueInvalid") : null}>
        <Input
          id="funnel-deal-value"
          data-escape-local
          autoFocus
          inputMode="decimal"
          value={text}
          disabled={saving}
          aria-invalid={invalid}
          aria-describedby={invalid ? "funnel-deal-value-error" : undefined}
          onChange={(e) => {
            setText(e.target.value)
            setInvalid(false)
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault()
              setEditing(false)
            }
          }}
        />
      </FormField>
      <div className="flex justify-end gap-2">
        <button type="button" className={actionClass({ variant: "secondary", size: "sm" })} disabled={saving} onClick={() => setEditing(false)}>
          {t("cancel")}
        </button>
        <button type="submit" className={actionClass({ size: "sm" })} disabled={saving}>
          {saving ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  )
}

/** Right-side details of one deal: contact (editable), stage, value / owner / labels, checklist, attachments and comments. */
export function DealDrawer(props: Props) {
  const { dealId, row, stages, board, owners, labels, moving, feedback, canLoadMore, loadingMore, t, language, onClose, onMove, onLoadMore, onPatchRow, onContactSaved } = props
  const [now] = useState(() => props.now ?? new Date())
  const [editingContact, setEditingContact] = useState(false)
  const [dealStatus, setDealStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null)

  const cardId = row?.cardId ?? null
  useEffect(() => {
    setEditingContact(false)
    setDealStatus(null)
  }, [cardId])

  // The deals list carries no conversation (no JSYNQ card list returns it): the drawer asks for the deal's own.
  const [fetched, setFetched] = useState<{ cardId: string; conversation: FunnelRow["conversation"] } | null>(null)
  const rowConversation = row?.conversation ?? null
  useEffect(() => {
    if (!cardId || rowConversation) return
    let alive = true
    void loadFunnelDealConversationAction(cardId)
      .then((res) => {
        if (alive && res.success) setFetched({ cardId, conversation: res.data })
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [cardId, rowConversation])
  const conversation = rowConversation ?? (fetched && fetched.cardId === cardId ? fetched.conversation : null)

  const name = row ? rowName(row) || t("unnamed") : t("drawerTitle")
  const myFeedback = row && feedback?.cardId === row.cardId ? feedback : null
  const dealRef: DealRef | null = row && board?.projectId ? { projectId: board.projectId, boardId: board.id, cardId: row.cardId } : null
  // Phone and e-mail under the name (minus whichever already stands in for a missing name).
  const subtitle = !row
    ? ""
    : !row.contact
      ? t("noContact")
      : lacksPhoneAndEmail(row.contact)
        ? t("noPhoneOrEmail")
        : [row.contact.phone?.trim(), row.contact.email?.trim()].filter((v): v is string => !!v && v !== name).join(" · ")

  /** Saves a deal field: shows it on the row at once, rolls back if the server refuses. */
  const saveDeal = async (patch: DealPatch, optimistic: Partial<FunnelRow>): Promise<boolean> => {
    if (!row || !dealRef) return false
    const before: Partial<FunnelRow> = Object.fromEntries(Object.keys(optimistic).map((k) => [k, row[k as keyof FunnelRow]]))
    onPatchRow(row.cardId, optimistic)
    setDealStatus(null)
    const res = await updateFunnelDealAction(dealRef, patch)
    if (!res.success) {
      onPatchRow(row.cardId, before)
      setDealStatus({ kind: "error", text: res.reference === "FUNNEL_VALUE_FROM_PRODUCTS" ? t("dealValueFromProducts") : t("dealSaveFailed") })
      return false
    }
    setDealStatus({ kind: "ok", text: t("dealSaved") })
    return true
  }

  const ownerOptions: PickerOption[] = [
    { id: NO_OWNER, label: t("unassigned") },
    ...owners.map((o) => ({ id: o.id, label: o.name, icon: <Avatar name={o.name} size={20} /> })),
  ]
  if (row?.owner && !owners.some((o) => o.id === row.owner?.id)) ownerOptions.push({ id: row.owner.id, label: row.owner.name || t("unnamed") })
  const labelOptions: PickerOption[] = labels.map((l) => ({
    id: l.id,
    label: l.name,
    icon: <span aria-hidden className="size-2 shrink-0 rounded-full bg-neutral-400" style={{ backgroundColor: safeColor(l.color) }} />,
  }))
  for (const l of row?.labels ?? []) if (!labelOptions.some((o) => o.id === l.id)) labelOptions.push({ id: l.id, label: l.text })

  return (
    <Sheet open={!!dealId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        hideCloseButton
        className="flex w-full flex-col gap-0 overflow-y-auto border-neutral-50 bg-white p-0 text-neutral-900 dark:bg-white sm:max-w-[440px]"
        // An inline editor handles its own Escape (cancel) instead of closing the drawer.
        onEscapeKeyDown={(e) => {
          if ((e.target as HTMLElement | null)?.closest?.("[data-escape-local]")) e.preventDefault()
        }}
      >
        <SheetHeader className="sticky top-0 z-10 gap-0 border-b border-neutral-50 bg-white px-5 py-4 text-left sm:px-6">
          <div className="flex items-start gap-3">
            {row && <Avatar name={rowAvatarName(row)} url={row.contact?.avatarUrl} size={40} />}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
              <SheetTitle className="truncate text-body-16 font-semibold text-neutral-900">{name}</SheetTitle>
              <SheetDescription className="truncate text-body-13 text-neutral-500">{subtitle || t("drawerTitle")}</SheetDescription>
            </div>
            {row?.contact && !editingContact && (
              <IconAction label={t("editContact")} onClick={() => setEditingContact(true)}>
                <Edit2 size={16} aria-hidden />
              </IconAction>
            )}
            <IconAction label={t("drawerClose")} onClick={onClose}>
              <CloseSquare size={18} aria-hidden />
            </IconAction>
          </div>
        </SheetHeader>

        {!row ? (
          <div className="flex flex-col items-start gap-3 p-6" data-testid="deal-not-loaded">
            <p className="text-body-14 text-neutral-700" aria-live="polite">
              {loadingMore ? t("loading") : t("drawerNotLoaded")}
            </p>
            {canLoadMore && !loadingMore && (
              <button type="button" className={actionClass({ variant: "secondary", size: "sm" })} onClick={onLoadMore}>
                {t("drawerLoadMore")}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-1 flex-col divide-y divide-neutral-50">
            {editingContact && row.contact && (
              <div className="p-5 sm:px-6">
                <DealContactForm
                  contactId={row.contact.id}
                  fallback={{ name: row.contact.name ?? "", phone: row.contact.phone ?? "", email: row.contact.email ?? "" }}
                  t={t}
                  onCancel={() => setEditingContact(false)}
                  onSaved={(draft) => {
                    if (row.contact) onContactSaved(row.contact.id, draft)
                    setEditingContact(false)
                  }}
                />
              </div>
            )}

            <div className="flex flex-col gap-4 p-5 sm:px-6">
              <Section id="deal-stage" title={t("drawerStage")}>
                {stages.length > 0 ? (
                  <Picker
                    label={t("drawerMoveAria")}
                    value={<StageBadge stage={row.stage} t={t} />}
                    options={stages.map((s) => ({
                      id: s.id,
                      label: stageLabel(s, t),
                      icon: <span aria-hidden className="size-2 shrink-0 rounded-full bg-neutral-400" style={{ backgroundColor: safeColor(s.color) }} />,
                    }))}
                    selected={row.stage?.id ?? null}
                    disabled={moving}
                    onSelect={(id) => onMove(row.cardId, id)}
                  />
                ) : (
                  <StageBadge stage={row.stage} t={t} className="self-start" />
                )}
                <p
                  role={myFeedback?.kind === "error" ? "alert" : "status"}
                  aria-live="polite"
                  className={cn("text-body-12 empty:hidden", myFeedback?.kind === "error" ? "text-error-dark" : "text-neutral-500")}
                >
                  {moving ? t("drawerMoving") : (myFeedback?.text ?? "")}
                </p>
              </Section>

              <dl className="flex flex-col gap-2.5">
                <Detail label={t("drawerDeal")}>
                  {dealRef ? (
                    <ValueEditor
                      row={row}
                      t={t}
                      language={language}
                      // 0 clears the value: the backend then has no value for the deal (`deal: null`), not a zero.
                      onSave={(value) => saveDeal({ value }, { deal: value > 0 ? { value, currency: editCurrency(row), status: row.deal?.status ?? row.stage?.kind ?? "open" } : null })}
                    />
                  ) : (
                    <DealValue row={row} t={t} language={language} />
                  )}
                </Detail>
                <Detail label={t("drawerOwner")}>
                  <Picker
                    label={t("ownerPick")}
                    value={
                      row.owner ? (
                        <>
                          <Avatar name={row.owner.name} url={row.owner.avatarUrl} size={20} />
                          <span className="truncate">{row.owner.name || t("unnamed")}</span>
                        </>
                      ) : (
                        <span className="text-neutral-500">{t("unassigned")}</span>
                      )
                    }
                    options={ownerOptions}
                    selected={row.owner?.id ?? NO_OWNER}
                    disabled={!dealRef}
                    className="h-8 border-transparent px-2 hover:border-neutral-50"
                    onSelect={(id) => {
                      const owner = id === NO_OWNER ? null : owners.find((o) => o.id === id)
                      void saveDeal({ ownerId: id === NO_OWNER ? null : id }, { owner: owner ? { id: owner.id, name: owner.name, avatarUrl: null } : null })
                    }}
                  />
                </Detail>
                <Detail label={t("drawerLabels")}>
                  <Picker
                    multiple
                    label={t("labelsPick")}
                    value={
                      row.labels.length ? (
                        <span className="flex min-w-0 flex-wrap gap-1">
                          {row.labels.map((l) => (
                            <LabelPill key={l.id} text={l.text} color={l.color} />
                          ))}
                        </span>
                      ) : (
                        <span className="text-neutral-500">{t("drawerNoLabels")}</span>
                      )
                    }
                    options={labelOptions}
                    emptyText={t("labelsNoneToPick")}
                    selected={row.labels.map((l) => l.id)}
                    disabled={!dealRef}
                    className="h-auto min-h-8 border-transparent px-2 py-1 hover:border-neutral-50"
                    onSelect={(ids) => {
                      const next = ids.map((id) => {
                        const known = row.labels.find((l) => l.id === id)
                        const option = labels.find((l) => l.id === id)
                        return known ?? { id, text: option?.name ?? "", color: option?.color ?? null }
                      })
                      void saveDeal({ labelIds: ids }, { labels: next })
                    }}
                  />
                </Detail>
                <Detail label={t("drawerConversation")}>
                  {conversation ? (
                    <span className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-neutral-900">{t("conversationSummary", { channel: t(CHANNEL_KEY[conversation.channel]), handling: t(HANDLING_KEY[conversation.handling]) })}</span>
                        <span className="truncate text-body-12 text-neutral-500">
                          {formatRelativeTime(conversation.lastMessageAt ?? row.lastMessageAt, now, language) || t("noMessages")}
                        </span>
                      </span>
                      <Link href={inboxHref(conversation)} className={actionClass({ size: "sm", className: "shrink-0" })}>
                        <MessageText1 size={15} aria-hidden />
                        {t("drawerOpenConversation")}
                      </Link>
                    </span>
                  ) : (
                    <span className="text-neutral-500">{t("drawerNoConversation")}</span>
                  )}
                </Detail>
              </dl>
              {dealStatus && (
                <p role={dealStatus.kind === "error" ? "alert" : "status"} className={cn("text-body-12", dealStatus.kind === "error" ? "text-error-dark" : "text-neutral-500")}>
                  {dealStatus.text}
                </p>
              )}
            </div>

            {dealRef && (
              <div className="p-5 sm:px-6">
                <DealChecklist dealRef={dealRef} t={t} />
              </div>
            )}
            {dealRef && (
              <div className="p-5 sm:px-6">
                <DealAttachments cardId={dealRef.cardId} projectId={dealRef.projectId} t={t} language={language} />
              </div>
            )}
            {dealRef && (
              <div className="p-5 sm:px-6">
                <DealComments dealRef={dealRef} t={t} language={language} now={now} />
              </div>
            )}

            <p className="px-5 py-4 text-body-12 text-neutral-500 sm:px-6">
              {t("drawerMeta", { created: formatDateTime(row.createdAt, language), updated: formatDateTime(row.updatedAt, language) })}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
