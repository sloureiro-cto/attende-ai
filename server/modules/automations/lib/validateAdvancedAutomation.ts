import 'server-only';
import { isIP } from 'net';
import {
  ADVANCED_AUTOMATION_ID_PATTERN,
  ADVANCED_AUTOMATION_LIMITS,
  type AdvancedAutomationDefinition,
  type AdvancedAutomationNode,
} from '../types';
import { nodeOutputs } from './advancedAutomationGraph';

/**
 * `blocking` issues are about safety/integrity (bad ids, limits, SSRF, duplicates, dangling
 * connections): the automation can never be stored with them. Non-blocking ones are about completeness
 * (empty text, missing options): a draft may be saved with them, but the automation cannot be activated.
 */
export type AdvancedAutomationIssue = {
  path: string;
  message: string;
  blocking?: boolean;
};

/** Static SSRF screen for webhook URLs. Execution re-checks the resolved address too. */
export function webhookUrlProblem(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return 'is not a valid URL';
  }
  if (url.protocol !== 'https:') return 'must use https';
  if (url.username || url.password) return 'must not contain credentials';
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return 'needs a host';
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    (!host.includes('.') && isIP(host) === 0)
  ) {
    return 'must be a public host';
  }
  if (isIP(host)) return 'must use a hostname, not an IP address';
  if (url.port && url.port !== '443') {
    return 'must use the default https port';
  }
  return null;
}

const isNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const RESERVED_OPTION_IDS = [
  'other',
  'no_reply',
  'send_failed',
  'next',
  'answered',
];

function checkNode(
  node: AdvancedAutomationNode,
  path: string,
  issues: AdvancedAutomationIssue[]
) {
  const add = (message: string, blocking = false) =>
    issues.push({ path, message, ...(blocking ? { blocking: true } : {}) });
  if (!isNum(node.x) || !isNum(node.y)) add('needs a canvas position');

  switch (node.kind) {
    case 'send_message': {
      if (
        typeof node.text !== 'string' ||
        (!node.text.trim() && !node.attachmentUrl)
      ) {
        add('needs a message text or an attachment');
      }
      if ((node.text ?? '').length > ADVANCED_AUTOMATION_LIMITS.textChars) {
        add(
          `text is longer than ${ADVANCED_AUTOMATION_LIMITS.textChars} characters`,
          true
        );
      }
      if (node.replyMode === 'buttons' || node.replyMode === 'list') {
        const options = node.options ?? [];
        const max =
          node.replyMode === 'buttons'
            ? ADVANCED_AUTOMATION_LIMITS.buttons
            : ADVANCED_AUTOMATION_LIMITS.listRows;
        if (options.length === 0) add('needs at least one option');
        if (options.length > max) {
          add(`${node.replyMode} allow at most ${max} options`, true);
        }
        const labelMax =
          node.replyMode === 'buttons'
            ? ADVANCED_AUTOMATION_LIMITS.buttonLabelChars
            : ADVANCED_AUTOMATION_LIMITS.listLabelChars;
        const seen = new Set<string>();
        for (const option of options) {
          if (!ADVANCED_AUTOMATION_ID_PATTERN.test(option.id)) {
            add(`option id "${option.id}" is invalid`, true);
          }
          if (RESERVED_OPTION_IDS.includes(option.id)) {
            add(`option id "${option.id}" is reserved`, true);
          }
          if (seen.has(option.id)) {
            add(`duplicate option id "${option.id}"`, true);
          }
          seen.add(option.id);
          if (!option.label?.trim()) add('every option needs a label');
          if ((option.label ?? '').length > labelMax) {
            add(`option labels are limited to ${labelMax} characters`, true);
          }
        }
      } else if (node.replyMode !== 'none' && node.replyMode !== 'free') {
        add('invalid replyMode', true);
      }
      if (node.noReplyMinutes !== undefined) {
        if (
          !Number.isInteger(node.noReplyMinutes) ||
          node.noReplyMinutes < 1 ||
          node.noReplyMinutes > ADVANCED_AUTOMATION_LIMITS.noReplyMinutesMax
        ) {
          add('noReplyMinutes must be between 1 minute and 7 days', true);
        }
      }
      return;
    }
    case 'condition': {
      if (!node.rows?.length) add('needs at least one condition row');
      const seen = new Set<string>();
      for (const row of node.rows ?? []) {
        if (!ADVANCED_AUTOMATION_ID_PATTERN.test(row.id) || row.id === 'none') {
          add(`row id "${row.id}" is invalid`, true);
        }
        if (seen.has(row.id)) add(`duplicate row id "${row.id}"`, true);
        seen.add(row.id);
        if (!row.condition) add(`row "${row.id}" needs a condition`);
      }
      return;
    }
    case 'wait':
      if (
        !Number.isInteger(node.minutes) ||
        node.minutes < 1 ||
        node.minutes > ADVANCED_AUTOMATION_LIMITS.waitMinutesMax
      ) {
        add('wait must be between 1 minute and 30 days', true);
      }
      return;
    case 'split': {
      let total = 0;
      const seen = new Set<string>();
      for (const p of node.paths ?? []) {
        if (!ADVANCED_AUTOMATION_ID_PATTERN.test(p.id) || p.id === 'else') {
          add(`path id "${p.id}" is invalid`, true);
        }
        if (seen.has(p.id)) add(`duplicate path id "${p.id}"`, true);
        seen.add(p.id);
        if (!Number.isInteger(p.percent) || p.percent < 0 || p.percent > 100) {
          add('split percentages must be integers 0-100', true);
        }
        total += p.percent;
      }
      if (!node.paths?.length) add('needs at least one path');
      if (total > 100) add('split percentages add up to more than 100', true);
      return;
    }
    case 'goto_automation':
      if (!/^[0-9a-f]{24}$/i.test(node.automationId ?? ''))
        add('needs a valid automation');
      return;
    case 'set_field':
      if (!node.fieldId?.trim()) add('needs a field');
      return;
    case 'move_stage':
      if (!/^[0-9a-f]{24}$/i.test(node.columnId ?? '')) {
        add('needs a valid column');
      }
      return;
    case 'add_label':
      if (!node.labelText?.trim()) add('needs a label');
      else if (node.labelText.length > ADVANCED_AUTOMATION_LIMITS.labelChars)
        add(
          `label is too long (max ${ADVANCED_AUTOMATION_LIMITS.labelChars})`,
          true
        );
      if (
        node.labelColor !== undefined &&
        (typeof node.labelColor !== 'string' ||
          !/^#[0-9a-f]{6}$/i.test(node.labelColor))
      )
        add('label color must be a hex color like #6366f1', true);
      if (
        node.projectId !== undefined &&
        (typeof node.projectId !== 'string' ||
          !/^[0-9a-f]{24}$/i.test(node.projectId))
      )
        add('projectId is not a valid project id', true);
      return;
    case 'create_task':
      if (!node.title?.trim()) add('needs a title');
      return;
    case 'ai_agent':
      if (!node.instruction?.trim()) add('needs an instruction');
      if (!node.saveAnswerTo?.trim())
        add('needs a field to save the answer in');
      return;
    case 'webhook': {
      const problem = webhookUrlProblem(node.url ?? '');
      if (problem) add(`url ${problem}`, true);
      return;
    }
    case 'send_meta_template':
      if (!node.templateId?.trim()) add('needs a template');
      return;
    case 'handoff': {
      const hex = (v: unknown) =>
        typeof v === 'string' && /^[0-9a-f]{24}$/i.test(v);
      if (
        node.message !== undefined &&
        (typeof node.message !== 'string' ||
          node.message.length > ADVANCED_AUTOMATION_LIMITS.textChars)
      ) {
        add('message is too long', true);
      }
      if (node.to !== undefined && node.to !== 'person' && node.to !== 'ai') add('invalid handoff target', true);
      if (node.to === 'ai' && !hex(node.agentId)) add('needs the AI agent that takes the conversation');
      if (node.agentId !== undefined && !hex(node.agentId)) add('agentId is not a valid agent id', true);
      const mode = node.assignMode;
      if (
        mode !== undefined &&
        ![
          'all_crm_members',
          'specific_user',
          'member_list',
          'by_workspace_role',
        ].includes(mode)
      ) {
        add('invalid assign mode', true);
      }
      if (
        node.userIds !== undefined &&
        (!Array.isArray(node.userIds) ||
          node.userIds.length > 50 ||
          node.userIds.some((id) => !hex(id)))
      ) {
        add('userIds must be valid user ids (max 50)', true);
      }
      if (node.specificUserId !== undefined && !hex(node.specificUserId))
        add('specificUserId is not a valid user id', true);
      if (node.workspaceRoleId !== undefined && !hex(node.workspaceRoleId))
        add('workspaceRoleId is not a valid role id', true);
      if (mode === 'specific_user' && !hex(node.specificUserId))
        add('choose who receives the conversation');
      if (mode === 'member_list' && !node.userIds?.length)
        add('choose at least one member');
      if (mode === 'by_workspace_role' && !hex(node.workspaceRoleId))
        add('choose a role');
      return;
    }
    case 'stop':
      return;
    default:
      add('unknown step type', true);
  }
}

/** Structural + per-step validation of an automation. Pure; the API turns these into a 400. */
export function validateAdvancedAutomation(
  automation: Pick<
    AdvancedAutomationDefinition,
    'startNodeId' | 'nodes' | 'edges'
  >
): AdvancedAutomationIssue[] {
  const issues: AdvancedAutomationIssue[] = [];
  if (!Array.isArray(automation.nodes) || !Array.isArray(automation.edges)) {
    return [
      {
        path: 'automation',
        message: 'nodes and edges must be arrays',
        blocking: true,
      },
    ];
  }
  if (automation.nodes.length === 0) {
    return [{ path: 'nodes', message: 'add at least one step' }];
  }
  if (automation.nodes.length > ADVANCED_AUTOMATION_LIMITS.nodes) {
    issues.push({
      path: 'nodes',
      message: `at most ${ADVANCED_AUTOMATION_LIMITS.nodes} steps`,
      blocking: true,
    });
  }
  if (automation.edges.length > ADVANCED_AUTOMATION_LIMITS.edges) {
    issues.push({
      path: 'edges',
      message: `at most ${ADVANCED_AUTOMATION_LIMITS.edges} connections`,
      blocking: true,
    });
  }

  const byId = new Map<string, AdvancedAutomationNode>();
  for (const node of automation.nodes) {
    const path = `nodes[${node?.id}]`;
    if (
      !node ||
      !ADVANCED_AUTOMATION_ID_PATTERN.test(node.id ?? '') ||
      node.id.startsWith('__')
    ) {
      issues.push({ path, message: 'invalid id', blocking: true });
      continue;
    }
    if (byId.has(node.id)) {
      issues.push({ path, message: 'duplicate id', blocking: true });
      continue;
    }
    byId.set(node.id, node);
    checkNode(node, path, issues);
  }

  if (!byId.has(automation.startNodeId)) {
    issues.push({ path: 'startNodeId', message: 'must be one of the steps' });
  }

  const edgeIds = new Set<string>();
  const usedOutputs = new Set<string>();
  for (const edge of automation.edges) {
    const path = `edges[${edge?.id}]`;
    const block = (message: string) =>
      issues.push({ path, message, blocking: true });
    if (!edge || !ADVANCED_AUTOMATION_ID_PATTERN.test(edge.id ?? '')) {
      block('invalid id');
      continue;
    }
    if (edgeIds.has(edge.id)) block('duplicate id');
    edgeIds.add(edge.id);
    const from = byId.get(edge.from);
    if (!from) {
      block(`unknown source step ${edge.from}`);
      continue;
    }
    if (!byId.has(edge.to)) block(`unknown target step ${edge.to}`);
    if (!nodeOutputs(from).includes(edge.output)) {
      block(`${edge.from} has no exit "${edge.output}"`);
    }
    // One destination per exit keeps the flow deterministic (use a split/condition to branch).
    const key = `${edge.from}:${edge.output}`;
    if (usedOutputs.has(key)) {
      block(`exit "${edge.output}" of ${edge.from} is connected twice`);
    }
    usedOutputs.add(key);
  }
  return issues;
}

export const blockingIssues = (issues: AdvancedAutomationIssue[]) =>
  issues.filter((i) => i.blocking);
