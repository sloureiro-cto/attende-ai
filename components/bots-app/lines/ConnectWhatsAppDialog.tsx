"use client"

import { useGateValue } from "@statsig/react-bindings"
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, X } from "lucide-react"
import { useSession } from "next-auth/react"
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import {
  type CloudApiCredentialsFormValue,
  emptyCloudApiCredentials,
  isCloudApiCredentialsValid,
} from "@/lib/whatsapp-lite/cloudApiCredentials"
import {
  buildWhatsAppEmbeddedSignupExtras,
  getMetaEmbeddedSignupPublicConfig,
  isFacebookEmbeddedSignupOrigin,
  parseWaEmbeddedSignupSessionInfo,
  shouldOfferWhatsAppEmbeddedSignup,
} from "@/lib/whatsapp-lite/embeddedSignup"
import { launchWhatsAppEmbeddedSignup, loadFacebookSdk } from "@/lib/whatsapp-lite/loadFacebookSdk"
import {
  createCloudApiWhatsAppSessionAction,
  createEmbeddedSignupCloudApiSessionAction,
  createWhatsAppSessionAction,
  getWhatsAppCloudConnectOptionsAction,
  updateWhatsAppSessionAction,
} from "actions/whatsapp-lite"
import type { WhatsAppSession } from "actions/whatsapp-lite/types"
import { showToast } from "app/utils/showToast"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "components/ui/dialog"
import { isMessagingChannelPlanError } from "lib/plans/canAddMessagingChannelLine"
import { ChannelGlyph } from "./ChannelGlyph"
import { CloudCredentialsFields, PinInput } from "./CloudCredentialsFields"
import { ConnectChooser, type ConnectMethod } from "./ConnectChooser"
import { ToggleRow } from "./ToggleRow"
import { useQrPairing } from "./useQrPairing"
import { BrandMark } from "../BrandMark"
import { actionClass } from "../ui/actionStyles"
import { useBotsAppT } from "../useBotsAppT"

type Step = "choose" | "qr" | "cloud" | "cloud-pin" | "success"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Resume the QR step of an existing session (reconnect) instead of starting a new pairing. */
  initialSession?: WhatsAppSession | null
  /** Called when a session is created or changes while the dialog is open. */
  onSessionUpsert: (session: WhatsAppSession) => void
  workspaceName: string
}

const spin = "size-4 animate-spin motion-reduce:animate-none"

/** Attende-ai mark joined to the WhatsApp glyph: "this app, linked to your number". */
function LinkMarks({ done = false }: { done?: boolean }) {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      <BrandMark withName={false} size={40} />
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn("size-1 rounded-full", done ? "bg-primary-dark" : "bg-neutral-200")} />
        ))}
      </span>
      <ChannelGlyph channel="whatsapp" className="size-10" />
    </div>
  )
}

function Footer({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 mt-auto flex flex-col-reverse gap-2.5 border-t border-neutral-50 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
      {children}
    </div>
  )
}

/**
 * The Attende-ai "connect a WhatsApp number" flow. Same backend actions, plan checks and steps as the JSYNQ
 * modal (QR pairing, official API by Meta sign-in or manual credentials, PIN, attendant name), in the
 * bots app's own design. Full-screen on phones.
 */
export function ConnectWhatsAppDialog({ open, onOpenChange, initialSession = null, onSessionUpsert, workspaceName }: Props) {
  const { t } = useBotsAppT()
  const { data: auth } = useSession()
  const embeddedSignupGate = useGateValue("embbeded-signup")
  const [hasMetaOverride, setHasMetaOverride] = useState(false)
  const [step, setStep] = useState<Step>(initialSession ? "qr" : "choose")
  const [label, setLabel] = useState(initialSession?.label ?? "")
  const [method, setMethod] = useState<ConnectMethod>("qr")
  const [syncHistory, setSyncHistory] = useState(false)
  const [session, setSession] = useState<WhatsAppSession | null>(initialSession)
  const [addBusy, setAddBusy] = useState(false)
  const [cloudBusy, setCloudBusy] = useState(false)
  const [finishBusy, setFinishBusy] = useState(false)
  const [credentials, setCredentials] = useState<CloudApiCredentialsFormValue>(emptyCloudApiCredentials)
  const [pinRequired, setPinRequired] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [embeddedPin, setEmbeddedPin] = useState("")
  const [attendantName, setAttendantName] = useState(false)
  const metaIds = useRef<{ wabaId?: string; phoneNumberId?: string }>({})
  const pendingEmbeddedId = useRef<string | null>(null)

  useEffect(() => {
    if (!open) return
    setStep(initialSession ? "qr" : "choose")
    setSession(initialSession)
    setLabel(initialSession?.label ?? "")
    setMethod("qr")
    setSyncHistory(false)
    setAddBusy(false)
    setCloudBusy(false)
    setFinishBusy(false)
    setCredentials(emptyCloudApiCredentials())
    setPinRequired(false)
    setShowManual(false)
    setEmbeddedPin("")
    setAttendantName(false)
    metaIds.current = {}
    pendingEmbeddedId.current = null
    setHasMetaOverride(false)
  }, [open, initialSession])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void getWhatsAppCloudConnectOptionsAction().then((res) => {
      if (!cancelled && res.success) setHasMetaOverride(res.data.hasWorkspaceMetaAppOverride)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  const offerEmbeddedSignup = shouldOfferWhatsAppEmbeddedSignup({ gateEnabled: embeddedSignupGate, hasWorkspaceMetaOverride: hasMetaOverride })

  useEffect(() => {
    if (!open || !offerEmbeddedSignup) return
    const onMessage = (event: MessageEvent) => {
      if (!isFacebookEmbeddedSignupOrigin(event.origin)) return
      const parsed = parseWaEmbeddedSignupSessionInfo(event.data)
      if (!parsed) return
      if (parsed.wabaId) metaIds.current.wabaId = parsed.wabaId
      if (parsed.phoneNumberId) metaIds.current.phoneNumberId = parsed.phoneNumberId
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [open, offerEmbeddedSignup])

  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  const handleConnected = useCallback(
    (connected: WhatsAppSession) => {
      setSession(connected)
      onSessionUpsert(connected)
      setStep("success")
    },
    [onSessionUpsert]
  )

  const { qrDataUrl, failed: qrFailed, refresh: refreshQr } = useQrPairing(session?._id ?? null, open && step === "qr", handleConnected)

  // Backend messages are English-only and technical: show our own copy (the plan case keeps its specific hint).
  const planAwareError = (error: string) => (isMessagingChannelPlanError(error) ? t("connectPaidPlan") : t("connectGenericError"))
  const registeredToast = (registration?: { skippedAlreadyRegistered?: boolean }) =>
    showToast("success", registration?.skippedAlreadyRegistered ? t("connectAlreadyRegistered") : t("connectRegistered"))

  const startQr = async () => {
    const trimmed = label.trim()
    if (!trimmed) return
    setAddBusy(true)
    try {
      const res = await createWhatsAppSessionAction({ label: trimmed, syncHistory })
      if (!res.success) {
        showToast("error", planAwareError(res.error))
        return
      }
      setSession(res.data)
      onSessionUpsert(res.data)
      setStep("qr")
    } finally {
      setAddBusy(false)
    }
  }

  const cloudReady = isCloudApiCredentialsValid(credentials, { pinRequired })

  const connectManually = async () => {
    const trimmed = label.trim()
    if (!trimmed || !cloudReady) return
    setCloudBusy(true)
    try {
      const res = await createCloudApiWhatsAppSessionAction({ label: trimmed, credentials })
      if (!res.success) {
        if (res.pinRequired) setPinRequired(true)
        showToast("error", planAwareError(res.error))
        return
      }
      registeredToast(res.registration)
      handleConnected(res.data)
    } finally {
      setCloudBusy(false)
    }
  }

  const waitForMetaIds = async () => {
    const deadline = Date.now() + 12_000
    while (Date.now() < deadline) {
      const { wabaId, phoneNumberId } = metaIds.current
      if (wabaId && phoneNumberId) return { wabaId, phoneNumberId }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    throw new Error(t("connectMetaMissingIds"))
  }

  const connectWithMeta = async () => {
    const trimmed = label.trim()
    if (!trimmed || !offerEmbeddedSignup) return
    setCloudBusy(true)
    try {
      const config = getMetaEmbeddedSignupPublicConfig()
      const fb = await loadFacebookSdk({ appId: config.appId, version: config.sdkVersion })
      const extras = buildWhatsAppEmbeddedSignupExtras({ workspaceName, email: auth?.user?.email ?? undefined })
      const code = await launchWhatsAppEmbeddedSignup(fb, { configId: config.configId, extras })
      const ids = await waitForMetaIds()
      const res = await createEmbeddedSignupCloudApiSessionAction({ label: trimmed, code, wabaId: ids.wabaId, phoneNumberId: ids.phoneNumberId })
      if (!res.success) {
        if (res.pinRequired && res.pendingId) {
          pendingEmbeddedId.current = res.pendingId
          setEmbeddedPin("")
          setStep("cloud-pin")
        }
        showToast("error", planAwareError(res.error))
        return
      }
      registeredToast(res.registration)
      handleConnected(res.data)
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : t("connectMetaFailed"))
    } finally {
      setCloudBusy(false)
    }
  }

  const submitEmbeddedPin = async () => {
    const pendingId = pendingEmbeddedId.current
    const pin = embeddedPin.trim()
    if (!pendingId || !/^\d{6}$/.test(pin)) return
    setCloudBusy(true)
    try {
      const res = await createEmbeddedSignupCloudApiSessionAction({ pendingId, pin })
      if (!res.success) {
        if (res.pendingId) pendingEmbeddedId.current = res.pendingId
        showToast("error", planAwareError(res.error))
        return
      }
      pendingEmbeddedId.current = null
      registeredToast(res.registration)
      handleConnected(res.data)
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : t("connectMetaFailed"))
    } finally {
      setCloudBusy(false)
    }
  }

  const finish = async () => {
    if (!session || !attendantName) {
      close()
      return
    }
    setFinishBusy(true)
    try {
      const res = await updateWhatsAppSessionAction(session._id, { prependAttendantNameEnabled: attendantName })
      if (!res.success) {
        showToast("error", t("connectGenericError"))
        return
      }
      onSessionUpsert(res.data)
      close()
    } finally {
      setFinishBusy(false)
    }
  }

  const connectedName = session?.label?.trim() || label.trim() || workspaceName
  const heading =
    step === "qr"
      ? t("connectQrTitle")
      : step === "cloud"
        ? t("connectCloudTitle")
        : step === "cloud-pin"
          ? t("connectPinTitle")
          : step === "success"
            ? t("connectSuccessTitle", { name: connectedName })
            : t("connectTitle")
  const subheading =
    step === "cloud"
      ? offerEmbeddedSignup
        ? t("connectCloudEmbeddedBody")
        : t("connectCloudManualBody")
      : step === "cloud-pin"
        ? t("connectPinBody")
        : step === "success"
          ? t("connectSuccessBody")
          : step === "qr"
            ? t("connectQrWaiting")
            : t("connectSubtitle")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        overlayClassName="bg-black/50 backdrop-blur-[2px]"
        className={cn(
          // Phones: a full-screen sheet. Larger screens: a centered card.
          "left-0 top-0 flex h-[100dvh] max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-y-auto rounded-none border-0 bg-white p-0 pt-[env(safe-area-inset-top)] text-neutral-900 shadow-xl",
          "sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[min(90dvh,760px)] sm:w-[calc(100vw-2rem)] sm:max-w-[520px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:border-neutral-50 sm:pt-0"
        )}
      >
        <header className="flex flex-col gap-4 p-5 sm:px-6 sm:pt-6">
          <div className="flex items-start justify-between gap-3">
            {step === "success" ? (
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary-clean text-primary-dark" aria-hidden>
                <CheckCircle2 className="size-6" />
              </span>
            ) : (
              <LinkMarks />
            )}
            <button
              type="button"
              onClick={close}
              aria-label={t("connectClose")}
              className="-mr-1.5 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-10 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary active:bg-neutral-50"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <DialogTitle className="text-[20px] font-semibold leading-tight tracking-tight text-neutral-900">{heading}</DialogTitle>
            <DialogDescription className="text-body-14 leading-relaxed text-neutral-500">{subheading}</DialogDescription>
          </div>
        </header>

        {step === "choose" && (
          <ConnectChooser
            name={label}
            onNameChange={setLabel}
            method={method}
            onMethodChange={setMethod}
            syncHistory={syncHistory}
            onSyncHistoryChange={setSyncHistory}
            busy={addBusy}
            onCancel={close}
            onContinue={() => (method === "qr" ? void startQr() : setStep("cloud"))}
          />
        )}

        {step === "qr" && (
          <>
            <div className="flex flex-col gap-5 px-5 pb-6 sm:px-6">
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-50 bg-neutral-10 p-5">
                {/* The code is a picture on its own light backdrop, so it scans the same in both themes. */}
                <div className="flex size-[216px] items-center justify-center overflow-hidden rounded-xl bg-white p-2 shadow-sm">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrDataUrl} alt={t("connectQrAlt")} className="size-full object-contain" />
                  ) : (
                    <span className="flex flex-col items-center gap-2 text-body-13 text-neutral-500" role="status">
                      <Loader2 className="size-6 animate-spin motion-reduce:animate-none" aria-hidden />
                      {t("connectQrLoading")}
                    </span>
                  )}
                </div>
                <button type="button" onClick={() => void refreshQr()} className={actionClass({ variant: "secondary", size: "sm" })}>
                  <RefreshCw className="size-4" aria-hidden />
                  {t("connectQrRefresh")}
                </button>
              </div>

              {qrFailed && (
                <p role="alert" className="rounded-xl border border-error-lighter bg-error-clean px-4 py-3 text-body-13 text-error-darkest">
                  {t("connectQrFailed")}
                </p>
              )}

              <ol className="flex flex-col gap-3">
                {(["connectQrStep1", "connectQrStep2", "connectQrStep3"] as const).map((key, index) => (
                  <li key={key} className="flex items-start gap-3 text-body-14 text-neutral-700">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-clean text-body-12 font-semibold text-primary-dark" aria-hidden>
                      {index + 1}
                    </span>
                    <span className="pt-0.5">{t(key)}</span>
                  </li>
                ))}
              </ol>
              <p className="text-body-13 text-neutral-500">{t("connectQrCloseHint")}</p>
            </div>
            <Footer>
              <button type="button" className={actionClass({ variant: "secondary" })} onClick={close}>
                {t("connectClose")}
              </button>
            </Footer>
          </>
        )}

        {step === "cloud" && (
          <>
            <div className="flex flex-col gap-5 px-5 pb-6 sm:px-6">
              {offerEmbeddedSignup && (
                <div className="flex flex-col items-stretch gap-3">
                  <button
                    type="button"
                    className={actionClass({ size: "lg", block: true })}
                    disabled={cloudBusy}
                    aria-busy={cloudBusy || undefined}
                    onClick={() => void connectWithMeta()}
                  >
                    {cloudBusy && <Loader2 className={spin} aria-hidden />}
                    {cloudBusy ? t("connectCloudSaving") : t("connectCloudContinueMeta")}
                  </button>
                  <button
                    type="button"
                    aria-expanded={showManual}
                    onClick={() => setShowManual((v) => !v)}
                    className="self-center rounded px-2 py-1 text-body-13 font-semibold text-primary-dark underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {showManual ? t("connectCloudHideManual") : t("connectCloudShowManual")}
                  </button>
                </div>
              )}
              {(!offerEmbeddedSignup || showManual) && (
                <CloudCredentialsFields value={credentials} onChange={setCredentials} pinRequired={pinRequired} />
              )}
            </div>
            <Footer>
              <button type="button" className={actionClass({ variant: "ghost" })} onClick={() => setStep("choose")} disabled={cloudBusy}>
                <ArrowLeft className="size-4" aria-hidden />
                {t("connectBack")}
              </button>
              {(!offerEmbeddedSignup || showManual) && (
                <button
                  type="button"
                  className={actionClass()}
                  disabled={cloudBusy || !cloudReady}
                  aria-busy={cloudBusy || undefined}
                  onClick={() => void connectManually()}
                >
                  {cloudBusy && <Loader2 className={spin} aria-hidden />}
                  {cloudBusy ? t("connectCloudSaving") : t("connectCloudSubmit")}
                </button>
              )}
            </Footer>
          </>
        )}

        {step === "cloud-pin" && (
          <>
            <div className="flex flex-col gap-5 px-5 pb-6 sm:px-6">
              <PinInput id="connect-embedded-pin" value={embeddedPin} onChange={setEmbeddedPin} label={t("connectCloudPin")} hint={t("connectCloudPinNeeded")} />
            </div>
            <Footer>
              <button
                type="button"
                className={actionClass()}
                disabled={cloudBusy || !/^\d{6}$/.test(embeddedPin)}
                aria-busy={cloudBusy || undefined}
                onClick={() => void submitEmbeddedPin()}
              >
                {cloudBusy && <Loader2 className={spin} aria-hidden />}
                {cloudBusy ? t("connectCloudSaving") : t("connectPinSubmit")}
              </button>
            </Footer>
          </>
        )}

        {step === "success" && (
          <>
            <div className="flex flex-col gap-5 px-5 pb-6 sm:px-6">
              <ToggleRow
                title={t("connectSignatureTitle")}
                description={t("connectSignatureBody")}
                checked={attendantName}
                onCheckedChange={setAttendantName}
                disabled={finishBusy}
              />
            </div>
            <Footer>
              <button type="button" className={actionClass()} disabled={finishBusy} aria-busy={finishBusy || undefined} onClick={() => void finish()}>
                {finishBusy && <Loader2 className={spin} aria-hidden />}
                {attendantName ? t("connectFinish") : t("connectDone")}
              </button>
            </Footer>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
