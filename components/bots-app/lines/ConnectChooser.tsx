"use client"

import { BadgeCheck, Loader2, QrCode } from "lucide-react"
import { type FormEvent, useId, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { ToggleRow } from "./ToggleRow"
import { actionClass } from "../ui/actionStyles"
import { useBotsAppT } from "../useBotsAppT"

export type ConnectMethod = "qr" | "cloud"

type Props = {
  name: string
  onNameChange: (name: string) => void
  method: ConnectMethod
  onMethodChange: (method: ConnectMethod) => void
  syncHistory: boolean
  onSyncHistoryChange: (next: boolean) => void
  /** Creating the QR session. */
  busy?: boolean
  /** Called with a non-empty name; the parent starts the chosen flow. */
  onContinue: () => void
  onCancel: () => void
}

const METHODS: Array<{
  id: ConnectMethod
  Icon: typeof QrCode
  title: "connectMethodQrTitle" | "connectMethodCloudTitle"
  body: "connectMethodQrBody" | "connectMethodCloudBody"
  badge?: "connectMethodQrBadge"
}> = [
  { id: "qr", Icon: QrCode, title: "connectMethodQrTitle", body: "connectMethodQrBody", badge: "connectMethodQrBadge" },
  { id: "cloud", Icon: BadgeCheck, title: "connectMethodCloudTitle", body: "connectMethodCloudBody" },
]

/** First step of "connect a number": name the line and pick how to connect (QR code or official Meta API). */
export function ConnectChooser({
  name,
  onNameChange,
  method,
  onMethodChange,
  syncHistory,
  onSyncHistoryChange,
  busy = false,
  onContinue,
  onCancel,
}: Props) {
  const { t } = useBotsAppT()
  const id = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const [showError, setShowError] = useState(false)
  const nameMissing = name.trim().length === 0
  const invalid = showError && nameMissing

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    if (nameMissing) {
      setShowError(true)
      nameRef.current?.focus()
      return
    }
    onContinue()
  }

  return (
    <form noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 px-5 pb-6 sm:px-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-name`} className="text-body-14 font-semibold text-neutral-900">
            {t("connectNameLabel")}
            <span className="ml-0.5 text-error-dark" aria-hidden>
              *
            </span>
            <span className="sr-only"> ({t("connectRequired")})</span>
          </label>
          <input
            ref={nameRef}
            id={`${id}-name`}
            value={name}
            onChange={(e) => {
              onNameChange(e.target.value)
              if (e.target.value.trim()) setShowError(false)
            }}
            placeholder={t("connectNamePlaceholder")}
            autoComplete="off"
            required
            aria-invalid={invalid || undefined}
            aria-describedby={`${id}-name-hint`}
            className={cn(
              "h-11 w-full rounded-lg border bg-white px-3.5 text-body-14 text-neutral-900 transition-colors placeholder:text-neutral-300",
              "hover:border-neutral-200 focus:border-primary-dark focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary/40",
              invalid ? "border-error-dark" : "border-neutral-100"
            )}
          />
          <p id={`${id}-name-hint`} className={cn("text-body-13", invalid ? "text-error-dark" : "text-neutral-500")} aria-live="polite">
            {invalid ? t("connectNameMissing") : t("connectNameHint")}
          </p>
        </div>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-body-14 font-semibold text-neutral-900">{t("connectMethodLegend")}</legend>
          {METHODS.map(({ id: value, Icon, title, body, badge }) => {
            const selected = method === value
            return (
              <label key={value} className="block cursor-pointer">
                <input
                  type="radio"
                  name={`${id}-method`}
                  value={value}
                  checked={selected}
                  onChange={() => onMethodChange(value)}
                  className="peer sr-only"
                  aria-describedby={`${id}-${value}-body`}
                />
                <span
                  data-testid={`connect-method-${value}`}
                  data-selected={selected}
                  className={cn(
                    "flex items-start gap-3.5 rounded-xl border p-4 transition-[border-color,background-color,box-shadow]",
                    "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
                    selected
                      ? "border-primary-dark bg-primary-clean ring-1 ring-inset ring-primary-dark"
                      : "border-neutral-100 bg-white hover:border-neutral-200 hover:bg-neutral-10"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg",
                      selected ? "bg-white text-primary-dark" : "bg-neutral-10 text-neutral-600"
                    )}
                    aria-hidden
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-body-14 font-semibold text-neutral-900">{t(title)}</span>
                      {badge && (
                        <span className="rounded-full bg-white px-2 py-0.5 text-body-12 font-semibold text-primary-dark ring-1 ring-inset ring-primary-lighter">
                          {t(badge)}
                        </span>
                      )}
                    </span>
                    <span id={`${id}-${value}-body`} className="text-body-13 leading-snug text-neutral-600">
                      {t(body)}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      selected ? "border-primary-dark" : "border-neutral-200"
                    )}
                  >
                    {selected && <span className="size-2.5 rounded-full bg-primary-dark" />}
                  </span>
                </span>
              </label>
            )
          })}
        </fieldset>

        {method === "qr" && (
          <ToggleRow
            title={t("connectSyncTitle")}
            description={t("connectSyncBody")}
            checked={syncHistory}
            onCheckedChange={onSyncHistoryChange}
            disabled={busy}
          />
        )}
      </div>

      <div className="sticky bottom-0 mt-auto flex flex-col-reverse gap-2.5 border-t border-neutral-50 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <button type="button" className={actionClass({ variant: "ghost" })} onClick={onCancel}>
          {t("connectCancel")}
        </button>
        <button type="submit" className={actionClass()} disabled={busy} aria-busy={busy || undefined}>
          {busy && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />}
          {t("connectContinue")}
        </button>
      </div>
    </form>
  )
}
