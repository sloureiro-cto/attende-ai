import { jsonSchemaToToolInputs } from "./jsonSchemaToToolInputs"
import type { ToolDefinition } from "./types"

/** One row from `GET /workspaces/:workspaceId/workflow-builder/tools`. */
export interface WorkflowBuilderToolItem {
  aggregatedToolId: string
  connectionId: string
  /** Persist on `step.toolId` in the workflow template. */
  toolId: string
  toolName: string
  displayName: string
  description: string
  category: string
  provider: string
  paramsSchema: unknown
  outputSchema?: unknown
  annotations?: {
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
    openWorldHint?: boolean
  }
  operationType?: string
  resourceType?: string
  requiresHumanConfirmation?: boolean
}

export interface WorkflowBuilderStepFieldGuideEntry {
  key: string
  label: string
  description?: string
  required?: boolean
  valueType?: string
}

export interface WorkflowBuilderCatalogData {
  tools: WorkflowBuilderToolItem[]
  stepFieldGuide: WorkflowBuilderStepFieldGuideEntry[]
  /** PT copy: `{{inputs.*}}` / `{{steps.*}}` in param strings. */
  templateBindingHint: string
}

export interface WorkflowBuilderCatalogMeta {
  total: number
  limit: number
  offset: number
}

/** Maps API catalog item → palette / StepConfigPanel {@link ToolDefinition}. `toolId` is stored as `_id`. */
export function workflowBuilderItemToToolDefinition(item: WorkflowBuilderToolItem): ToolDefinition {
  const inputs = jsonSchemaToToolInputs(item.paramsSchema)
  return {
    _id: item.toolId,
    id: item.toolId,
    name: item.displayName?.trim() || item.toolName || item.toolId,
    description: item.description ?? "",
    category: normalizeCategory(item.category),
    inputs,
    outputs: [],
    config: {
      aggregatedToolId: item.aggregatedToolId,
      connectionId: item.connectionId,
      provider: item.provider,
      paramsSchema: item.paramsSchema,
      outputSchema: item.outputSchema,
      annotations: item.annotations,
      operationType: item.operationType,
      resourceType: item.resourceType,
      requiresHumanConfirmation: item.requiresHumanConfirmation,
      toolName: item.toolName,
    },
    isEnabled: true,
  }
}

function normalizeCategory(raw: string | undefined): string {
  const c = (raw || "other").toLowerCase().trim()
  const allowed = new Set([
    "crm",
    "communication",
    "search",
    "payment",
    "code",
    "productivity",
    "other",
    "webhook",
    "flow",
    "ai",
    "project",
  ])
  return allowed.has(c) ? c : "other"
}
