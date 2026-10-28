import 'server-only';
import { env } from '../../../config/env';
import type { AttendeeAgentForm } from '../types';
import { FORM_LIMITS } from './formSchema';

/**
 * Everything the JSYNQ agent and its bindings need besides the compiled prompt. Pure, so the
 * "restricted tool surface" contract is unit-tested:
 *  - tools: only knowledge search + human handoff. JSYNQ staging takes tool ids (`availableTools`),
 *    resolved by name from the workspace's tool registry (`GET /api/workspaces/:id/mcp-tools`);
 *    the WhatsApp tool gate then keeps a bound run to its own conversation, and
 *    `request_human_handoff` only exists when the binding sets `allowHumanHandoff`;
 *  - knowledge is fenced as untrusted data in the compiled prompt (JSYNQ staging has no
 *    `knowledgeTrust` flag);
 *  - capabilities: no internet, no workspace data, knowledge base on.
 */
export const AGENT_TOOL_NAMES = ['search_knowledge_base', 'request_human_handoff'] as const;

export function agentModelConfig() {
  return {
    provider: 'openai' as const,
    model: env().AGENT_MODEL,
    // Customer-facing: stay close to the instructions and keep answers short.
    temperature: 0.3,
    maxSteps: 8,
    maxTokens: 800,
  };
}

export const AGENT_CAPABILITIES = { internetAccess: false, workspaceDataAccess: false, knowledgeBaseAccess: true } as const;
export const AGENT_RATE_LIMIT = { maxExecutionsPerMinute: 30, maxExecutionsPerHour: 600 } as const;

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const fromMinutes = (n: number): string => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

/**
 * The binding supports ONE daily window. Per-weekday hours are described in the prompt; the window
 * here is their union (earliest opening to latest closing).
 */
export function activeWindow(form: AttendeeAgentForm) {
  const wh = form.workingHours;
  if (!wh || wh.days.length === 0) return null;
  const open = Math.min(...wh.days.map((d) => toMinutes(d.open)));
  const close = Math.max(...wh.days.map((d) => toMinutes(d.close)));
  return { start: fromMinutes(open), end: fromMinutes(close), timezone: wh.timezone };
}

export type BindingPolicy = Record<string, unknown> & {
  sendReply: boolean;
  allowHumanHandoff: boolean;
};

/**
 * JSYNQ binding policy (sent whole: JSYNQ replaces `policy` on PATCH). Only fields JSYNQ staging's
 * binding model has. Who takes over a handed-off conversation (`form.handoff.target`) is not a
 * binding field there: the worker (phase 4) assigns it through the conversation assign route.
 */
export function buildBindingPolicy(form: AttendeeAgentForm, crm?: { projectId: string; columnId: string }): BindingPolicy {
  const window = activeWindow(form);
  return {
    sendReply: true,
    stopOnUserIntervention: true,
    maxRepliesPerDay: form.maxRepliesPerContactPerDay ?? FORM_LIMITS.maxRepliesPerContactPerDay.default,
    ...(window ? { activeHoursStart: window.start, activeHoursEnd: window.end, timezone: window.timezone } : {}),
    // Everything beyond answering this contact stays OFF.
    workspaceAccess: 'none',
    allowMessagingOtherContacts: false,
    allowReadingOtherConversations: false,
    allowImageGeneration: false,
    allowHumanHandoff: true,
    ...(crm
      ? { autoCreateLead: true, autoCreateLeadProjectId: crm.projectId, autoCreateLeadColumnId: crm.columnId, autoCreateLeadSourceText: 'Attende-ai' }
      : { autoCreateLead: false }),
  };
}
