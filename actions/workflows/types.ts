/**
 * Workflow Builder Types
 * Contains all type definitions for the workflow builder system
 */

// =============================================================================
// Enums
// =============================================================================

export type WorkflowStatus = "draft" | "published" | "archived"

export type WorkflowWebhookEndpoint = {
  path?: string
  url: string
  method: "POST"
  secretConfigured: boolean
  secretHeader: "X-Workflow-Secret"
  contentType: "application/json"
  setupNote: string
}

export type PublishWorkflowResponse = {
  success: boolean
  newVersion: number
  message: string
  webhookEndpoints?: WorkflowWebhookEndpoint[]
}

export type WorkflowTriggerType =
  | "manual"
  | "scheduled"
  | "webhook"
  | "event"
  | "trigger"
  | "telegram_command"
  | "card_moved"
  | "card_created"
  | "card_field_changed"
  | "card_deadline_set"
  | "document_created"
  | "transcription_created"
  | "whatsapp_keyword"
  | "whatsapp_message_received"
  | "sms_keyword"
  | "sms_message_received"
  | "instagram_keyword"
  | "instagram_message_received"
  | "form_response_submitted"

export type StepType = "start" | "tool" | "condition" | "human_confirmation" | "end" | "wait" | "loop"

export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped" | "cancelled" | "waiting_for_human"

export type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "paused"
  | "waiting_for_human"

export type ToolCategory = "ai" | "data" | "communication" | "integration" | "logic" | "custom"

// =============================================================================
// Core Types (backward compatible with existing code)
// =============================================================================

export interface WorkflowVariable {
  name: string
  path?: string
  type: "string" | "number" | "boolean" | "object" | "array" | "input" | "step" | "global"
  stepId?: string
  description?: string
  defaultValue?: unknown
  required?: boolean
  source?: "input" | "step" | "global"
  /** Optional nested paths (full `steps.*` paths) shown under this variable in the picker. */
  nestedPickable?: { label: string; path: string }[]
}

export interface WorkflowStep {
  id: string
  stepId?: string
  type: StepType
  name: string
  description?: string
  position: { x: number; y: number }
  config: StepConfig
  nextSteps?: string[]
  prevSteps?: string[]
  dependsOn?: string[]
  condition?: string
  outputs?: WorkflowVariable[]
  metadata?: Record<string, unknown>
  // Tool-specific fields (backward compatibility)
  toolId?: string
  params?: Record<string, unknown>
  timeoutSeconds?: number
  retryConfig?: {
    maxRetries: number
    backoffType: "fixed" | "exponential"
    initialDelayMs: number
  }
}

export interface StepConfig {
  // Tool-specific configuration
  toolId?: string
  toolConfig?: Record<string, unknown>

  // Condition-specific
  condition?: {
    operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "matches"
    leftOperand: string // Variable reference like {{steps.stepId.result}}
    rightOperand: string | number | boolean
    trueBranch?: string // Step ID for true branch
    falseBranch?: string // Step ID for false branch
  }

  // Human confirmation
  confirmationConfig?: {
    assignee?: string
    message?: string
    timeoutMinutes?: number
    autoApprove?: boolean
  }

  // Wait step
  waitConfig?: {
    duration?: number // seconds
    untilDate?: string
    condition?: string // Variable condition
  }

  // Loop configuration
  loopConfig?: {
    iterable: string // Variable reference
    iteratorVariable: string
    maxIterations?: number
  }

  // Generic metadata
  [key: string]: unknown
}

/** Trigger conditions (AND/OR tree) evaluated on CRM card snapshot — backend §4. */
export type WorkflowConditionOperator =
  | "includes_any"
  | "includes_all"
  | "is_empty"
  | "is_not_empty"
  | "in"
  | "eq"
  | "contains"

export type WorkflowConditionRuleField = "assignedUserIds" | "labelIds" | "leadSourceIds" | "columnId" | "customField"

export interface WorkflowConditionRule {
  kind: "rule"
  field: WorkflowConditionRuleField | string
  operator: WorkflowConditionOperator | string
  value?: unknown
  customFieldId?: string
}

export interface WorkflowConditionGroup {
  kind: "group"
  op: "and" | "or"
  items: WorkflowConditionNode[]
}

export type WorkflowConditionNode = WorkflowConditionGroup | WorkflowConditionRule

export interface WorkflowTrigger {
  id?: string
  type: WorkflowTriggerType
  name?: string
  config: TriggerConfig
  /** Optional CRM/card filter tree (supported on card_moved, card_created, form_response_submitted). */
  conditions?: WorkflowConditionNode
  enabled?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface TriggerConfig {
  // Scheduled trigger
  schedule?: {
    cron: string
    timezone: string
  }

  // Webhook trigger
  webhook?: {
    path: string
    method: "POST" | "GET" | "PUT" | "DELETE"
    secret?: string
  }

  // Event trigger
  event?: {
    eventType: string
    filters?: Record<string, unknown>
  }

  // Telegram command
  telegramCommand?: {
    command: string
    description: string
  }

  // Generic
  [key: string]: unknown
}

export interface WorkflowTemplate {
  _id?: string
  id?: string
  workspaceId?: string
  name: string
  description: string
  category: string
  tags: string[]
  icon?: string
  steps: WorkflowStep[]
  variables: WorkflowVariable[]
  triggers: WorkflowTrigger[]
  humanConfirmationSteps: string[]
  notificationConfig: {
    onStart: boolean
    onComplete: boolean
    onError: boolean
    notifyChannels: ("telegram" | "email" | "slack")[]
  }
  version?: number
  isPublished?: boolean
  isTemplate?: boolean
  isActive?: boolean
  isPublic?: boolean
  /** Position among the automations of the same stage (drag & drop); also the run order. */
  displayOrder?: number
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  /** Present when the template has at least one webhook trigger (from create/get/list/publish). */
  webhookEndpoints?: WorkflowWebhookEndpoint[]
}

// =============================================================================
// Execution Types
// =============================================================================

export interface StepResult {
  stepId: string
  status: StepStatus | "pending" | "running" | "completed" | "failed" | "skipped"
  startedAt?: string
  completedAt?: string
  durationMs?: number
  output?: unknown
  result?: unknown
  error?: {
    code: string
    message: string
    stack?: string
  }
  logs?: string[]
  inputSnapshot?: Record<string, unknown>
}

export interface WorkflowExecution {
  _id?: string
  id?: string
  workflowId: string
  workflowName?: string
  status: ExecutionStatus
  /** Legacy UI field; backend may only send `triggeredBy`. */
  triggerType?: WorkflowTriggerType
  triggerData?: Record<string, unknown>
  context?: ExecutionContext
  stepResults: Record<string, StepResult> | StepResult[]
  startedAt: string
  completedAt?: string
  createdBy?: string
  triggeredBy?: "user" | "schedule" | "webhook" | "agent" | "telegram"
  inputs?: Record<string, unknown>
  outputs?: Record<string, unknown>
  error?: string
}

export interface ExecutionContext {
  variables: Record<string, unknown>
  secrets?: Record<string, string>
  metadata?: Record<string, unknown>
}

// =============================================================================
// Tool Definition Types
// =============================================================================

export interface ToolDefinition {
  _id?: string
  id?: string
  name: string
  description: string
  category: ToolCategory | string
  icon?: string
  version?: string
  author?: string
  inputs: ToolInput[] | ToolParameter[]
  outputs: ToolOutput[] | ToolParameter[]
  config?: Record<string, unknown>
  documentationUrl?: string
  isCustom?: boolean
  isEnabled?: boolean
}

export interface ToolInput {
  name: string
  type: "string" | "number" | "boolean" | "object" | "array" | "file" | "json"
  label?: string
  description?: string
  required: boolean
  defaultValue?: unknown
}

export interface ToolOutput {
  name: string
  type: "string" | "number" | "boolean" | "object" | "array" | "file"
  label?: string
  description?: string
}

export interface ToolParameter {
  name: string
  type: "string" | "number" | "boolean" | "object" | "array" | "file" | "json"
  description: string
  required: boolean
  defaultValue?: unknown
  options?: unknown[] // For enum types
  validation?: {
    pattern?: string
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
  }
}

// =============================================================================
// Workflow Entity
// =============================================================================

export interface Workflow {
  id: string
  _id?: string
  name: string
  description?: string
  status: WorkflowStatus
  version: number
  steps: WorkflowStep[]
  variables: WorkflowVariable[]
  triggers: WorkflowTrigger[]
  tags: string[]
  humanConfirmationSteps?: string[]
  notificationConfig?: WorkflowTemplate["notificationConfig"]
  organizationId: string
  workspaceId?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  lastPublishedAt?: string
  lastExecutionAt?: string
  executionCount: number
  isPublished?: boolean
  isActive?: boolean
}

// =============================================================================
// API Types
// =============================================================================

export interface CreateWorkflowInput {
  name: string
  description?: string
  category?: string
  templateId?: string
  steps?: WorkflowStep[]
  triggers?: WorkflowTrigger[]
  humanConfirmationSteps?: string[]
  notificationConfig?: WorkflowTemplate["notificationConfig"]
}

export interface UpdateWorkflowInput {
  name?: string
  description?: string
  category?: string
  steps?: WorkflowStep[]
  variables?: WorkflowVariable[]
  triggers?: WorkflowTrigger[]
  humanConfirmationSteps?: string[]
  notificationConfig?: WorkflowTemplate["notificationConfig"]
  tags?: string[]
  isPublished?: boolean
  isActive?: boolean
}

export interface ExecuteWorkflowInput {
  workflowId: string
  variables?: Record<string, unknown>
  triggerData?: Record<string, unknown>
  synchronous?: boolean
}

export interface GenerateWorkflowInput {
  description: string
  category?: string
  includeHumanConfirmation?: boolean
}

export interface WorkflowValidationError {
  stepId?: string
  field?: string
  message: string
  severity: "error" | "warning"
}

export interface WorkflowValidationResult {
  valid: boolean
  errors: WorkflowValidationError[]
  warnings: WorkflowValidationError[]
}

export interface WorkflowExecutionFilters {
  status?: ExecutionStatus
  triggeredBy?: WorkflowExecution["triggeredBy"]
  startDate?: string
  endDate?: string
}

// =============================================================================
// UI Types
// =============================================================================

export interface NodeData {
  step: WorkflowStep
  isSelected: boolean
  isExecuting: boolean
  executionStatus?: StepStatus
  onConfigure: (stepId: string) => void
  onDelete: (stepId: string) => void
  onDuplicate: (stepId: string) => void
}

export interface EdgeData {
  label?: string
  condition?: "true" | "false"
}

export interface WorkflowStats {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  averageDuration: number
  lastExecutionAt?: string
}

export interface WorkflowTemplateSummary {
  _id: string
  name: string
  description: string
  category: string
  stepCount: number
  tags: string[]
}

// =============================================================================
// Legacy UI Types (backward compatibility)
// =============================================================================

export interface WorkflowNodeData {
  label: string
  stepId: string
  stepType: StepType | "start" | "tool" | "condition" | "human_confirmation" | "end"
  toolId?: string
  /** Technical JSYNQ / MCP tool name (e.g. `list_cards`). */
  toolName?: string
  /** Localized label for the tool card subtitle. */
  toolDisplayName?: string
  params?: Record<string, unknown>
  condition?: string
  description?: string
  isConfigured?: boolean
  onConfigure?: () => void
  onDelete?: () => void
  /** Opens delete confirmation in the canvas (tool nodes). */
  onRequestDelete?: () => void
  /** Last builder test run — step status from polled execution. */
  testRunStatus?:
    | StepStatus
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "skipped"
    | "cancelled"
    | "waiting_for_human"
  testRunResult?: unknown
  testRunError?: { message?: string; code?: string }
}
