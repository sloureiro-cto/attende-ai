"use client"

import { type FormEvent, useEffect, useRef, useState } from "react"
import { loadFunnelContactAction, updateFunnelContactAction } from "actions/attende/funnel"
import { type ContactDraft, type ContactField, LIMITS, validateContactDraft } from "lib/attende/funnel/deal"
import type { AttendeFunnelKey } from "lib/i18n/translations/attende/funnel"
import { FormField, Input } from "./fields"
import type { AttendeFunnelT } from "./useAttendeFunnelT"
import { actionClass } from "../ui/actionStyles"

const ERROR_KEY: Record<ContactField, AttendeFunnelKey> = { name: "contactInvalidName", phone: "contactInvalidPhone", email: "contactInvalidEmail" }

type Props = {
  contactId: string
  /** What the row shows (the phone may be masked): used until the stored values arrive. */
  fallback: ContactDraft
  t: AttendeFunnelT
  onSaved: (draft: ContactDraft) => void
  onCancel: () => void
}

/** Edits the contact's name, phone and e-mail. Loads the stored values first (the table may show a masked phone). */
export function DealContactForm({ contactId, fallback, t, onSaved, onCancel }: Props) {
  const [draft, setDraft] = useState<ContactDraft>(fallback)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fieldError, setFieldError] = useState<ContactField | null>(null)
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    void loadFunnelContactAction(contactId).then((res) => {
      if (!alive) return
      setLoading(false)
      if (res.success) setDraft(res.data)
      else setError(t("contactLoadFailed"))
      requestAnimationFrame(() => nameRef.current?.focus())
    })
    return () => {
      alive = false
    }
  }, [contactId, t])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const checked = validateContactDraft(draft)
    if (!checked.ok) {
      setFieldError(checked.field)
      return
    }
    setFieldError(null)
    setError(null)
    setSaving(true)
    const res = await updateFunnelContactAction(contactId, checked.value)
    setSaving(false)
    if (!res.success) {
      setError(t("contactSaveFailed"))
      return
    }
    onSaved(res.data)
  }

  const set = (field: ContactField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft((d) => ({ ...d, [field]: e.target.value }))
    if (fieldError === field) setFieldError(null)
  }
  const fieldProps = (field: ContactField) => ({
    id: `funnel-contact-${field}`,
    value: draft[field],
    onChange: set(field),
    disabled: loading || saving,
    "aria-invalid": fieldError === field,
    "aria-describedby": fieldError === field ? `funnel-contact-${field}-error` : undefined,
  })

  return (
    <form onSubmit={submit} noValidate aria-label={t("editContact")} className="flex flex-col gap-4" data-testid="contact-form">
      <FormField id="funnel-contact-name" label={t("contactName")} error={fieldError === "name" ? t(ERROR_KEY.name) : null}>
        <Input ref={nameRef} {...fieldProps("name")} autoComplete="name" maxLength={LIMITS.name} required />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="funnel-contact-phone" label={t("drawerPhone")} error={fieldError === "phone" ? t(ERROR_KEY.phone) : null}>
          <Input {...fieldProps("phone")} type="tel" inputMode="tel" autoComplete="tel" maxLength={LIMITS.phone} />
        </FormField>
        <FormField id="funnel-contact-email" label={t("drawerEmail")} error={fieldError === "email" ? t(ERROR_KEY.email) : null}>
          <Input {...fieldProps("email")} type="email" inputMode="email" autoComplete="email" maxLength={LIMITS.email} />
        </FormField>
      </div>
      {error && (
        <p role="alert" className="text-body-12 text-error-dark">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className={actionClass({ variant: "secondary", size: "sm" })} onClick={onCancel} disabled={saving}>
          {t("cancel")}
        </button>
        <button type="submit" className={actionClass({ size: "sm" })} disabled={loading || saving}>
          {saving ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  )
}
