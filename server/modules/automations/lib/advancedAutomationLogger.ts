import 'server-only';
import { log } from '../../../lib/logger';

/**
 * One structured line per event: `[AdvancedAutomation] {"level":"warn","event":"cas_exhausted","workspaceId":...}`.
 * Callers pass identifiers (workspaceId, automationId, runId, conversationId, eventId, channel) and error
 * messages only; never message text, names or phone numbers.
 *
 * Problems that need a human's eye are `warn` so they stand out and can be alerted on; the normal
 * life of a run (started, ended, version continued) is `info`.
 */
const WARN_EVENTS = new Set([
  'cas_exhausted',
  'executor_error',
  'effect_failed',
  'send_failed',
  'handoff_message_failed',
  'handoff_assign_failed',
  'handoff_state_failed',
  'move_stage_failed',
  'webhook_failed',
  'human_check_error',
  'condition_error',
  'condition_timeout',
  'inbound_hook_failed',
  'wake_enqueue_failed',
  'queue_message_dropped',
  'interpret_answer_timeout',
  'chain_depth_exceeded',
  'start_rate_limited',
  'create_task_unsupported',
  'meta_template_unsupported_channel',
  'set_field_no_card',
  'set_field_card_not_found',
]);

export type AdvancedAutomationLogSink = Pick<Console, 'log' | 'warn'>;

export function advancedAutomationLogLevel(event: string): 'warn' | 'info' {
  return WARN_EVENTS.has(event.replace(/^advanced_automation\./, ''))
    ? 'warn'
    : 'info';
}

export function logAdvancedAutomation(
  event: string,
  data: Record<string, unknown> = {},
  sink?: AdvancedAutomationLogSink
): void {
  const name = event.replace(/^advanced_automation\./, '');
  const level = advancedAutomationLogLevel(name);
  if (!sink) {
    log[level](`automation.${name}`, data);
    return;
  }
  let line: string;
  try {
    line = JSON.stringify({ level, event: name, ...data });
  } catch {
    line = JSON.stringify({ level, event: name, unserializable: true });
  }
  (level === 'warn' ? sink.warn : sink.log)(`[AdvancedAutomation] ${line}`);
}
