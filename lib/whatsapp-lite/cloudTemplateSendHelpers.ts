import type { WhatsAppCloudTemplate } from "actions/whatsapp-lite/types"

/** Meta sample templates that only work on developer test numbers. */
const META_SAMPLE_TEMPLATE_NAMES = new Set(["hello_world"])

export function isMetaSampleTemplateName(name: string): boolean {
  return META_SAMPLE_TEMPLATE_NAMES.has(name.trim().toLowerCase())
}

/** Keep templates scoped to the session WABA and optionally hide Meta sample templates from send UI. */
export function filterCloudTemplatesForSession(
  templates: WhatsAppCloudTemplate[],
  options?: { wabaId?: string | null; forSend?: boolean }
): WhatsAppCloudTemplate[] {
  const wabaId = options?.wabaId?.trim()
  let out = templates
  if (wabaId) {
    // Strict match only — legacy rows without wabaId must not leak across Business accounts.
    out = out.filter((tpl) => tpl.wabaId?.trim() === wabaId)
  }
  if (options?.forSend !== false) {
    out = out.filter((tpl) => !isMetaSampleTemplateName(tpl.name))
  }
  return out
}

export function approvedCloudTemplates(templates: WhatsAppCloudTemplate[]): WhatsAppCloudTemplate[] {
  return templates.filter((tpl) => tpl.status === "APPROVED")
}

export function approvedCloudTemplatesForSession(
  templates: WhatsAppCloudTemplate[],
  wabaId?: string | null
): WhatsAppCloudTemplate[] {
  return approvedCloudTemplates(filterCloudTemplatesForSession(templates, { wabaId, forSend: true }))
}

export function cloudTemplateBodyText(template: WhatsAppCloudTemplate | null): string {
  const components = Array.isArray(template?.components) ? template!.components : []
  const body = components.find(
    (c): c is { type: string; text?: string } =>
      typeof c === "object" && c !== null && (c as { type?: string }).type === "BODY"
  )
  return body?.text ?? ""
}

export function cloudTemplateHeaderFormat(
  template: WhatsAppCloudTemplate | null
): "IMAGE" | "VIDEO" | "DOCUMENT" | null {
  const components = Array.isArray(template?.components) ? template!.components : []
  const header = components.find(
    (c): c is { type: string; format?: string } =>
      typeof c === "object" && c !== null && (c as { type?: string }).type === "HEADER"
  )
  const fmt = header?.format?.toUpperCase()
  return fmt === "IMAGE" || fmt === "VIDEO" || fmt === "DOCUMENT" ? fmt : null
}

export function cloudTemplateVarKeys(bodyText: string): string[] {
  const keys = new Set<string>()
  for (const match of bodyText.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) {
    if (match[1]) keys.add(match[1])
  }
  return Array.from(keys).sort((a, b) => Number(a) - Number(b))
}

export function cloudTemplatePreview(bodyText: string, vars: Record<string, string>): string {
  return bodyText.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n: string) => vars[n]?.trim() || `{{${n}}}`)
}

export function buildCloudTemplateSendPayload(input: {
  template: WhatsAppCloudTemplate
  vars: Record<string, string>
  headerUrl: string
  bodyText: string
}): {
  templateName: string
  language: string
  components?: Array<Record<string, unknown>>
  bodyPreview: string
} {
  const varKeys = cloudTemplateVarKeys(input.bodyText)
  const headerFormat = cloudTemplateHeaderFormat(input.template)
  const components: Array<Record<string, unknown>> = []

  if (headerFormat) {
    const mediaKey = headerFormat.toLowerCase()
    components.push({
      type: "header",
      parameters: [{ type: mediaKey, [mediaKey]: { link: input.headerUrl.trim() } }],
    })
  }
  if (varKeys.length > 0) {
    components.push({
      type: "body",
      parameters: varKeys.map((k) => ({ type: "text", text: input.vars[k]!.trim() })),
    })
  }

  return {
    templateName: input.template.name,
    language: input.template.language,
    components: components.length ? components : undefined,
    bodyPreview: cloudTemplatePreview(input.bodyText, input.vars),
  }
}
