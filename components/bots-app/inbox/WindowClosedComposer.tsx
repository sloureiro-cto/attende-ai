"use client"

import { Clock } from "iconsax-react"
import { useEffect, useState } from "react"
import { sendWhatsAppTemplateAction } from "actions/whatsapp-lite/conversations"
import { getWhatsAppSessionAction } from "actions/whatsapp-lite/sessions"
import { showToast } from "app/utils/showToast"
import Button from "components/Button/Button"
import TextInput from "components/TextInput/TextInput"
import { useCloudTemplateComposer } from "hooks/useCloudTemplateComposer"
import { planBlockKind } from "lib/attende/planBlock"
import type { AttendeInboxT } from "./useAttendeInboxT"

type Props = {
  sessionId: string
  conversationId: string
  t: AttendeInboxT
  /** Called after a template went out, so the thread can refresh. */
  onSent: () => void
}

/**
 * Replaces the composer on an official WhatsApp line once the 24-hour window is closed: free text would not be
 * delivered, so the only way to reach the customer is an approved template (Meta rule).
 */
export function WindowClosedComposer({ sessionId, conversationId, t, onSent }: Props) {
  const [open, setOpen] = useState(false)
  const [wabaId, setWabaId] = useState<string | null>(null)
  /** The line's WABA must be known first: the template hook clears its list whenever the WABA changes. */
  const [sessionResolved, setSessionResolved] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [sending, setSending] = useState(false)
  const composer = useCloudTemplateComposer({ wabaId, sessionId })
  const { loadTemplates } = composer

  useEffect(() => {
    if (!open || sessionResolved) return
    let cancelled = false
    void getWhatsAppSessionAction(sessionId).then((session) => {
      if (cancelled) return
      if (session.success) setWabaId(session.data.cloudApiConfig?.wabaId?.trim() || null)
      setSessionResolved(true)
    })
    return () => {
      cancelled = true
    }
  }, [open, sessionId, sessionResolved])

  useEffect(() => {
    if (!open || !sessionResolved) return
    let cancelled = false
    setLoadFailed(false)
    void loadTemplates().then((res) => {
      if (!cancelled && res && !res.success) setLoadFailed(true)
    })
    return () => {
      cancelled = true
    }
  }, [open, sessionResolved, wabaId, loadTemplates])

  const send = async () => {
    const problem = composer.validate()
    if (problem) {
      if (problem !== "template_required") showToast("error", t("windowTemplateFillAll"))
      return
    }
    const payload = composer.buildSendPayload()
    if (!payload) return
    setSending(true)
    try {
      const res = await sendWhatsAppTemplateAction(sessionId, conversationId, payload)
      if (!res.success) {
        const block = planBlockKind(res.error)
        showToast("error", block === "quota" ? t("sendFailedQuota") : block === "inactive" ? t("sendFailedPlanInactive") : t("windowTemplateSendError"))
        return
      }
      showToast("success", t("windowTemplateSent"))
      composer.reset()
      setOpen(false)
      onSent()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-neutral-border bg-white px-4 py-3">
      <div className="flex items-start gap-3 rounded-lg bg-warning-clean px-3 py-2.5 text-warning-darkest">
        <Clock size={18} className="mt-0.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-body-13 font-semibold">{t("windowClosedTitle")}</p>
          <p className="text-body-13">{t("windowClosedBody")}</p>
        </div>
        {!open && (
          <Button variant="primary" size="small" className="shrink-0" onClick={() => setOpen(true)}>
            {t("windowChooseTemplate")}
          </Button>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-3">
          {!sessionResolved || composer.loading ? (
            <p className="text-body-13 text-neutral-500" role="status">
              {t("windowTemplatesLoading")}
            </p>
          ) : loadFailed ? (
            <p className="text-body-13 text-error-dark" role="alert">
              {t("windowTemplatesError")}
            </p>
          ) : composer.approved.length === 0 ? (
            <p className="text-body-13 text-neutral-500">{t("windowTemplatesNone")}</p>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-body-13 font-semibold text-neutral-700">{t("windowTemplateLabel")}</span>
                <select
                  value={composer.selectedTemplateId}
                  onChange={(e) => composer.setSelectedTemplateId(e.target.value)}
                  className="h-10 rounded border border-neutral-50 bg-white px-3 text-body-14 text-neutral-900 outline-none focus:border-neutral-900"
                >
                  <option value="">{t("windowTemplatePlaceholder")}</option>
                  {composer.approved.map((tpl) => (
                    <option key={tpl._id} value={tpl._id}>
                      {tpl.name} · {tpl.language}
                    </option>
                  ))}
                </select>
              </label>
              {composer.selectedTemplate && (
                <>
                  {composer.headerFormat && (
                    <TextInput
                      size="small"
                      name="template-header-url"
                      label={t("windowTemplateHeaderUrl")}
                      aria-label={t("windowTemplateHeaderUrl")}
                      value={composer.headerUrl}
                      onChange={(e) => composer.setHeaderUrl(e.target.value)}
                    />
                  )}
                  {composer.varKeys.map((key) => (
                    <TextInput
                      key={key}
                      size="small"
                      name={`template-var-${key}`}
                      label={t("windowTemplateVar", { n: key })}
                      aria-label={t("windowTemplateVar", { n: key })}
                      value={composer.vars[key] ?? ""}
                      onChange={(e) => composer.setVars((current) => ({ ...current, [key]: e.target.value }))}
                    />
                  ))}
                  <div className="rounded-lg border border-primary-lighter bg-primary-clean px-3 py-2">
                    <p className="text-body-11 font-semibold text-primary-dark">{t("windowTemplatePreview")}</p>
                    <p className="whitespace-pre-wrap text-body-14 text-primary-darkest">{composer.preview}</p>
                  </div>
                </>
              )}
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" style="outline" size="small" onClick={() => setOpen(false)} disabled={sending}>
              {t("cancel")}
            </Button>
            <Button variant="primary" size="small" onClick={() => void send()} disabled={sending || !composer.selectedTemplate}>
              {t("send")}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
