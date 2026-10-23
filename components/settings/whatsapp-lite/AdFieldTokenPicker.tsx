"use client"

import { Add } from "iconsax-react"
import SelectInput from "components/SelectInput/SelectInput"
import { useProjectsTranslation } from "hooks/useProjectsTranslation"
import {
  AD_FIELD_KEYS,
  AD_FIELD_KEYS_REQUIRING_META_ADS,
  AD_FIELD_LABEL_KEYS,
  type AdFieldKey,
} from "lib/whatsapp-lite/adAttribution"

/**
 * "+ Ad field" picker: inserts `{{ad.headline}}`-style tokens into a text field.
 * Fields that need the Meta Ads integration stay visible but disabled until it is connected,
 * so people discover them.
 */
export function AdFieldTokenPicker({
  onPick,
  labelFor,
  buttonLabel,
  lockedSuffix,
  metaAdsConnected,
  disabled = false,
}: {
  onPick: (key: AdFieldKey) => void
  labelFor: (key: AdFieldKey) => string
  buttonLabel: string
  /** Appended to locked fields, e.g. "(connect Meta Ads)". */
  lockedSuffix: string
  metaAdsConnected: boolean
  disabled?: boolean
}) {
  const items = AD_FIELD_KEYS.map((key) => {
    const locked = !metaAdsConnected && AD_FIELD_KEYS_REQUIRING_META_ADS.includes(key)
    return {
      value: key,
      displayName: locked ? `${labelFor(key)} ${lockedSuffix}` : labelFor(key),
      disabled: locked,
    }
  })

  return (
    <SelectInput
      size="small"
      value=""
      items={items}
      disabled={disabled}
      portalClassNames="z-[500]"
      onValueChange={(v) => {
        if ((AD_FIELD_KEYS as readonly string[]).includes(v)) onPick(v as AdFieldKey)
      }}
      triggerClassNames="w-auto shrink-0 rounded-md border border-neutral-50 bg-white px-2 shadow-sm hover:bg-neutral-10"
      customTrigger={
        <span className="flex h-8 items-center gap-1 text-body-12 font-medium text-neutral-700">
          <Add size={14} aria-hidden />
          {buttonLabel}
        </span>
      }
    />
  )
}

/**
 * Picker for workspace automations (label / lead source actions). The Meta Ads integration
 * is per project, so nothing is locked here; campaign fields stay empty without it.
 */
export function TemplateAdTokenPicker({ onPick, disabled }: { onPick: (key: AdFieldKey) => void; disabled?: boolean }) {
  const { t } = useProjectsTranslation()
  return (
    <AdFieldTokenPicker
      onPick={onPick}
      disabled={disabled}
      metaAdsConnected
      labelFor={(key) => t(AD_FIELD_LABEL_KEYS[key])}
      buttonLabel={t("crmAdAttrInsertField")}
      lockedSuffix=""
    />
  )
}
