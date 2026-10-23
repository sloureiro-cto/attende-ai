import type { ToolInput, ToolParameter } from "./types"

/**
 * Flattens a JSON Schema (MCP `inputSchema` / `paramsSchema`) into our {@link ToolInput} list
 * for the workflow StepConfigPanel. Supports `object.properties` with `required` and common `type` values.
 */
export function jsonSchemaToToolInputs(schema: unknown): (ToolInput | ToolParameter)[] {
  if (!schema || typeof schema !== "object") return []
  const root = schema as Record<string, unknown>

  // OpenAPI-style body wrapper
  if (root.properties && typeof root.properties === "object") {
    return propertiesToInputs(
      root.properties as Record<string, unknown>,
      Array.isArray(root.required) ? (root.required as string[]) : []
    )
  }

  // Some schemas use allOf with a single object
  if (Array.isArray(root.allOf) && root.allOf.length > 0) {
    for (const part of root.allOf) {
      if (part && typeof part === "object") {
        const p = part as Record<string, unknown>
        if (p.properties && typeof p.properties === "object") {
          return propertiesToInputs(
            p.properties as Record<string, unknown>,
            Array.isArray(p.required) ? (p.required as string[]) : []
          )
        }
      }
    }
  }

  return []
}

function propertiesToInputs(
  properties: Record<string, unknown>,
  requiredNames: string[]
): (ToolInput | ToolParameter)[] {
  return Object.entries(properties).map(([name, def]) => {
    const d = (def && typeof def === "object" ? def : {}) as Record<string, unknown>
    const t = typeof d.type === "string" ? d.type : inferTypeFromSchema(d)
    const jsType = mapJsonSchemaTypeToToolType(t, d)
    const label = typeof d.title === "string" && d.title.trim() ? d.title : humanizeKey(name)
    const description = typeof d.description === "string" ? d.description : ""
    const required = requiredNames.includes(name)
    const base = {
      name,
      type: jsType,
      label,
      description,
      required,
      defaultValue: d.default as unknown,
    } as const
    if (d.enum && Array.isArray(d.enum)) {
      return { ...base, type: "string" as const, options: d.enum } as ToolParameter
    }
    if (d.type === "array" && d.items && typeof d.items === "object") {
      return { ...base, type: "array" as const } as ToolInput
    }
    return base as ToolInput
  })
}

function inferTypeFromSchema(d: Record<string, unknown>): string {
  if (d.enum) return "string"
  if (d.properties) return "object"
  if (d.items) return "array"
  return "string"
}

function mapJsonSchemaTypeToToolType(t: string, def: Record<string, unknown>): ToolInput["type"] {
  if (t === "integer" || t === "number") return "number"
  if (t === "boolean") return "boolean"
  if (t === "array") return "array"
  if (t === "object") return "object"
  if (def.properties && typeof def.properties === "object") return "object"
  if (def.enum) return "string"
  return "string"
}

function humanizeKey(key: string): string {
  if (!key) return key
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/^\s+/, "")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
