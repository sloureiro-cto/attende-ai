import type { ProjectsTranslationKey } from "lib/i18n/translations/projects"

/**
 * Click-to-WhatsApp ad attribution (official WhatsApp Cloud API only).
 * Mirrors workspace-backend `src/modules/projects/lib/crmAdAttribution.ts`.
 */

export const AD_FIELD_KEYS = [
  "ad.id",
  "ad.headline",
  "ad.body",
  "ad.sourceType",
  "ad.url",
  "ad.ctwaClid",
  "ad.name",
  "adset.id",
  "adset.name",
  "campaign.id",
  "campaign.name",
] as const

export type AdFieldKey = (typeof AD_FIELD_KEYS)[number]

/** Need the Meta Ads integration (Marketing API names). */
export const AD_FIELD_KEYS_REQUIRING_META_ADS: readonly AdFieldKey[] = [
  "ad.name",
  "adset.id",
  "adset.name",
  "campaign.id",
  "campaign.name",
]

/** Translation keys (projects namespace) for each ad field. */
export const AD_FIELD_LABEL_KEYS: Record<AdFieldKey, ProjectsTranslationKey> = {
  "ad.id": "crmAdAttrFieldAdId",
  "ad.headline": "crmAdAttrFieldHeadline",
  "ad.body": "crmAdAttrFieldBody",
  "ad.sourceType": "crmAdAttrFieldSourceType",
  "ad.url": "crmAdAttrFieldUrl",
  "ad.ctwaClid": "crmAdAttrFieldCtwaClid",
  "ad.name": "crmAdAttrFieldAdName",
  "adset.id": "crmAdAttrFieldAdsetId",
  "adset.name": "crmAdAttrFieldAdsetName",
  "campaign.id": "crmAdAttrFieldCampaignId",
  "campaign.name": "crmAdAttrFieldCampaignName",
}

export const CTWA_CONVERSION_EVENT_NAMES = [
  "LeadSubmitted",
  "QualifiedLead",
  "Purchase",
  "InitiateCheckout",
  "AddToCart",
  "ViewContent",
  "OrderCreated",
] as const

export type CtwaConversionEventName = (typeof CTWA_CONVERSION_EVENT_NAMES)[number]

export interface CrmAdAttributionConfig {
  enabled: boolean
  leadSource?: { mode: "fixed" | "from_ad"; fixedText?: string; template?: string }
  labels: Array<{ template: string; color?: string }>
  fieldMappings: Array<{ source: AdFieldKey; fieldId: string; fieldName?: string }>
  metaAdsIntegrationId?: string
  multiTouch: "first_only" | "append"
  conversions?: { enabled: boolean; eventName: CtwaConversionEventName }
}

export const EMPTY_AD_ATTRIBUTION_CONFIG: CrmAdAttributionConfig = {
  enabled: false,
  leadSource: { mode: "from_ad", template: "{{ad.headline}}", fixedText: "" },
  labels: [],
  fieldMappings: [],
  multiTouch: "first_only",
  conversions: { enabled: false, eventName: "LeadSubmitted" },
}

/** Stored ad click (card / conversation `adAttribution.first|last`). */
export interface AdReferralSnapshot {
  sourceType?: "ad" | "post" | "unknown"
  sourceId?: string
  sourceUrl?: string
  headline?: string
  body?: string
  thumbnailUrl?: string
  ctwaClid?: string
  adName?: string
  adsetName?: string
  campaignName?: string
  receivedAt?: string
}

export function adToken(key: AdFieldKey): string {
  return `{{${key}}}`
}

/** Appends a token to a text field, separated by a space when needed. */
export function insertAdToken(text: string | undefined, key: AdFieldKey): string {
  const base = (text ?? "").replace(/\s+$/, "")
  return base ? `${base} ${adToken(key)}` : adToken(key)
}

const TOKEN_RE = /\{\{\s*([^}]*?)\s*\}\}/g

export function unknownAdTokens(text: string | undefined): string[] {
  const known = new Set<string>(AD_FIELD_KEYS)
  const out = new Set<string>()
  for (const m of (text ?? "").matchAll(TOKEN_RE)) {
    const key = m[1] ?? ""
    if (!known.has(key)) out.add(key)
  }
  return [...out]
}

/** Preview with a sample ad, same trimming rules as the backend resolver. */
export function previewAdTemplate(template: string, sample: Partial<Record<AdFieldKey, string>>): string {
  return template
    .replace(TOKEN_RE, (_m, key: string) => sample[key as AdFieldKey] ?? "")
    .replace(/\s+/g, " ")
    .replace(/^[\s·|:\-–—,/]+|[\s·|:\-–—,/]+$/g, "")
    .trim()
}
