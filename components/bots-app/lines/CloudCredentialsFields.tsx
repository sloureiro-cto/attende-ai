"use client"

import { ExternalLink, Eye, EyeOff } from "lucide-react"
import { type ReactNode, useId, useState } from "react"
import { cn } from "@/lib/utils"
import { type CloudApiCredentialsFormValue, sanitizeCloudApiPinInput } from "@/lib/whatsapp-lite/cloudApiCredentials"
import { useBotsAppT } from "../useBotsAppT"

const META_PHONE_NUMBERS_URL = "https://business.facebook.com/latest/whatsapp_manager/phone_numbers"

export const fieldInputClass = cn(
  "h-11 w-full rounded-lg border border-neutral-100 bg-white px-3.5 text-body-14 text-neutral-900 transition-colors placeholder:text-neutral-300",
  "hover:border-neutral-200 focus:border-primary-dark focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary/40"
)

function Field({ id, label, hint, children, aside }: { id: string; label: string; hint: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-body-13 font-semibold text-neutral-900">
          {label}
        </label>
        {aside}
      </div>
      {children}
      <p id={`${id}-hint`} className="text-body-12 leading-snug text-neutral-500">
        {hint}
      </p>
    </div>
  )
}

/** A 6-digit PIN input with a show/hide toggle and a digit counter. */
export function PinInput({
  id,
  value,
  onChange,
  label,
  hint,
}: {
  id: string
  value: string
  onChange: (pin: string) => void
  label: string
  hint: string
}) {
  const { t } = useBotsAppT()
  const [visible, setVisible] = useState(false)
  const length = value.trim().length
  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      aside={
        <span className={cn("text-body-12 font-medium tabular-nums", length === 6 ? "text-primary-dark" : "text-neutral-500")}>
          {t("connectCloudPinProgress", { count: length })}
        </span>
      }
    >
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          value={value}
          onChange={(e) => onChange(sanitizeCloudApiPinInput(e.target.value))}
          placeholder="••••••"
          aria-describedby={`${id}-hint`}
          className={cn(fieldInputClass, "pr-11 tracking-[0.3em]")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("connectCloudHidePin") : t("connectCloudShowPin")}
          aria-pressed={visible}
          className="absolute inset-y-1 right-1 flex w-9 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-10 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
    </Field>
  )
}

type Props = {
  value: CloudApiCredentialsFormValue
  onChange: (next: CloudApiCredentialsFormValue) => void
  /** Meta asked for the number's PIN on a previous attempt. */
  pinRequired: boolean
}

/** Manual official-API credentials (WABA ID, phone number ID, token, optional PIN). */
export function CloudCredentialsFields({ value, onChange, pinRequired }: Props) {
  const { t } = useBotsAppT()
  const id = useId()
  const patch = (partial: Partial<CloudApiCredentialsFormValue>) => onChange({ ...value, ...partial })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5 rounded-xl border border-info-lighter bg-info-clean px-4 py-3">
        <p className="text-body-13 text-info-darkest">{t("connectCloudChecklist")}</p>
        <a
          href={META_PHONE_NUMBERS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 rounded text-body-13 font-semibold text-info-darkest underline underline-offset-2 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {t("connectCloudMetaLink")}
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </div>

      <Field id={`${id}-waba`} label={t("connectCloudWabaId")} hint={t("connectCloudWabaIdHint")}>
        <input
          id={`${id}-waba`}
          value={value.wabaId}
          onChange={(e) => patch({ wabaId: e.target.value })}
          inputMode="numeric"
          autoComplete="off"
          placeholder="123456789012345"
          aria-describedby={`${id}-waba-hint`}
          className={fieldInputClass}
        />
      </Field>
      <Field id={`${id}-phone`} label={t("connectCloudPhoneId")} hint={t("connectCloudPhoneIdHint")}>
        <input
          id={`${id}-phone`}
          value={value.phoneNumberId}
          onChange={(e) => patch({ phoneNumberId: e.target.value })}
          inputMode="numeric"
          autoComplete="off"
          placeholder="098765432109876"
          aria-describedby={`${id}-phone-hint`}
          className={fieldInputClass}
        />
      </Field>
      <Field id={`${id}-token`} label={t("connectCloudToken")} hint={t("connectCloudTokenHint")}>
        <input
          id={`${id}-token`}
          type="password"
          value={value.accessToken}
          onChange={(e) => patch({ accessToken: e.target.value })}
          autoComplete="off"
          placeholder="EAAG…"
          aria-describedby={`${id}-token-hint`}
          className={fieldInputClass}
        />
      </Field>
      <PinInput
        id={`${id}-pin`}
        value={value.pin}
        onChange={(pin) => patch({ pin })}
        label={t("connectCloudPin")}
        hint={pinRequired ? t("connectCloudPinNeeded") : t("connectCloudPinHint")}
      />
    </div>
  )
}
