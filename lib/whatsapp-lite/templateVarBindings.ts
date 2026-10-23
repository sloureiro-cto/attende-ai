import type { BlastTemplateVarBinding } from "actions/whatsapp-lite/blastCampaignTypes"

export type TemplateVarBindings = Record<string, BlastTemplateVarBinding>

/** Preview with CRM field labels / defaults (template editor & blast). */
export function previewTemplateBodyWithBindings(body: string | undefined, varBindings: TemplateVarBindings): string {
  if (!body) return ""
  return body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n: string) => {
    const binding = varBindings[n]
    if (binding?.defaultValue?.trim()) return binding.defaultValue.trim()
    if (binding?.crmField) return `[${binding.crmField}]`
    return `{{${n}}}`
  })
}

/** Replace placeholders with resolved values for send preview. */
export function renderTemplateBodyWithValues(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n: string) => {
    const value = vars[n]
    return value !== undefined && value !== "" ? value : `{{${n}}}`
  })
}

export function extractTemplateVarKeys(text: string): string[] {
  const keys = new Set<string>()
  for (const m of text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) {
    if (m[1]) keys.add(m[1])
  }
  return Array.from(keys).sort((a, b) => Number(a) - Number(b))
}

/** Drop bindings for placeholders no longer present in the body. */
export function pruneVarBindingsForBody(body: string, bindings: TemplateVarBindings): TemplateVarBindings {
  const keys = new Set(extractTemplateVarKeys(body))
  const out: TemplateVarBindings = {}
  for (const key of keys) {
    if (bindings[key]) out[key] = bindings[key]!
  }
  return out
}

export function cloneVarBindings(bindings?: TemplateVarBindings | null): TemplateVarBindings {
  if (!bindings) return {}
  return Object.fromEntries(Object.entries(bindings).map(([k, v]) => [k, { ...v }]))
}
