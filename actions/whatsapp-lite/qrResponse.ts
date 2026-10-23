import { pickData } from "actions/parseBackendEnvelope"
import type { WhatsAppQrPollPayload } from "./types"

const QR_CANDIDATE_KEYS = [
  "qrCode",
  "qr",
  "qrcode",
  "qrBase64",
  "qr_base64",
  "image",
  "png",
  "dataUrl",
  "data_url",
] as const

/** Resumo seguro para logs (sem corpo base64 completo). */
export function summarizeQrResponseForDebug(raw: unknown): Record<string, unknown> {
  if (raw == null) return { shape: "nullish" }
  if (Array.isArray(raw)) {
    return {
      shape: "array",
      length: raw.length,
      firstType: raw.length ? typeof raw[0] : "empty",
    }
  }
  if (typeof raw !== "object") return { shape: "primitive", type: typeof raw }

  const root = raw as Record<string, unknown>
  const inner = pickData<Record<string, unknown>>(raw)
  const innerIsSame = inner === root

  const lensFor = (obj: Record<string, unknown> | undefined | null, label: string) => {
    const out: Record<string, unknown> = {}
    if (!obj) return out
    for (const k of QR_CANDIDATE_KEYS) {
      const v = obj[k]
      if (typeof v === "string" && v.length > 0) {
        out[`${label}.${k}`] = { len: v.length, head: v.slice(0, 32) }
      }
    }
    return out
  }

  return {
    shape: "object",
    rootKeys: Object.keys(root),
    innerKeys: inner && !innerIsSame ? Object.keys(inner) : undefined,
    ...lensFor(root, "root"),
    ...lensFor(inner ?? null, "inner"),
  }
}

/** Normaliza valor para `src` de `<img>` — aceita data URL ou base64 PNG cru. */
export function normalizeQrToDataUrl(s: string): string {
  const t = s.trim()
  if (t.startsWith("data:")) return t
  const b64 = t.replace(/\s/g, "")
  if (b64.length >= 80 && /^[A-Za-z0-9+/=]+$/.test(b64)) {
    return `data:image/png;base64,${b64}`
  }
  return t
}

/**
 * Extrai string usável pelo `<img src>` a partir da resposta GET …/sessions/:id/qr.
 * Suporta nomes alternativos comuns no backend e `data` plano ou `{ success, data }`.
 */
export function extractQrImageFromResponse(raw: unknown): string | undefined {
  if (raw == null || typeof raw !== "object") return undefined

  const root = raw as Record<string, unknown>
  const inner = pickData<Record<string, unknown>>(raw) ?? root

  const tryRecord = (obj: Record<string, unknown> | undefined | null): string | undefined => {
    if (!obj || typeof obj !== "object") return undefined
    const keys = QR_CANDIDATE_KEYS
    for (const k of keys) {
      const v = obj[k]
      if (typeof v === "string" && v.length > 0) {
        return normalizeQrToDataUrl(v)
      }
    }
    return undefined
  }

  return tryRecord(inner) ?? tryRecord(root)
}

/**
 * Corpo normalizado para o modal de QR — inclui `qrReady` e `status` para não confundir
 * `qrCode: null` (a aguardar Baileys) com erro de transporte ou “empty body”.
 */
export function parseWhatsAppQrPollPayload(raw: unknown): WhatsAppQrPollPayload | null {
  if (raw == null || typeof raw !== "object") return null
  const inner = pickData<Record<string, unknown>>(raw)
  if (!inner || typeof inner !== "object") return null

  const status = inner.status
  if (typeof status !== "string" || !status.length) return null

  let qrCode: string | null = null
  const qrRaw = inner.qrCode
  if (typeof qrRaw === "string" && qrRaw.length > 0) {
    qrCode = normalizeQrToDataUrl(qrRaw)
  }

  let qrReady = false
  if (typeof inner.qrReady === "boolean") {
    qrReady = inner.qrReady
  } else if (qrCode) {
    qrReady = true
  }

  const hint = typeof inner.hint === "string" && inner.hint.length > 0 ? inner.hint : undefined

  return { qrCode, qrReady, status, hint }
}
