import 'server-only';
import { createHash } from 'crypto';
import { regexPatternProblem } from './regexSafety';

/**
 * Condition tree of a `condition` step or a trigger filter. Same JSON DSL as the JSYNQ rule
 * templates, so automations built in the studio keep their shape.
 */
export type AutomationCondition =
  | { type: 'all'; clauses: AutomationCondition[] }
  | { type: 'any'; clauses: AutomationCondition[] }
  | { type: 'first_inbound' }
  | {
      /**
       * CRM lead was newly created on this inbound (not linked/reused).
       * `scope: workspace` = first card for this contact in the workspace;
       * `scope: project` = new card in the given project (optional column/board filter).
       */
      type: 'new_lead';
      scope: 'workspace' | 'project';
      projectId?: string;
      /** When set with empty `columnIds`, match any column on this CRM tab. */
      boardId?: string;
      columnIds?: string[];
    }
  | { type: 'contains'; value: string; caseInsensitive?: boolean }
  | { type: 'not_contains'; value: string; caseInsensitive?: boolean }
  | { type: 'regex'; pattern: string }
  | {
      type: 'llm_match';
      /** Closed set of labels the model must choose from */
      labels: string[];
      /** Match succeeds when model output (normalized) equals this label */
      match: string;
      /** Extra hint for the classifier (optional) */
      hint?: string;
    }
  | {
      type: 'llm_conversation_match';
      /** Closed set of labels the model must choose from */
      labels: string[];
      /** Match succeeds when model output (normalized) equals this label */
      match: string;
      /** Extra hint for the classifier (optional) */
      hint?: string;
      /** User-defined prompt injected as system context for the conversation classifier */
      classificationPrompt?: string;
    }
  | {
      /**
       * Extract an event/due date from the conversation (LLM extracts only),
       * then compare calendar days from today → event with `days` using `op`.
       * Prefer this over asking `llm_conversation_match` to do date arithmetic
       * (models frequently miscount "more than 30 days").
       */
      type: 'event_date_days_ahead';
      op: 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
      days: number;
      /**
       * When no date can be extracted: `false` (default) → condition fails;
       * `true` → condition passes (e.g. "qualify if missing date or ≤30 days").
       */
      matchIfMissing?: boolean;
    }
  | { type: 'within_business_hours' }
  | { type: 'outside_business_hours' }
  | {
      /**
       * Linked CRM lead is in / not in one of the project/column pairs.
       * Empty `columnIds` (or omitted) = any column in that project.
       * Rows are OR'd (`anyOf`).
       * `mode: 'not_in'` matches when the lead is outside all listed rows
       * (no linked card also matches `not_in`).
       */
      type: 'linked_card_in';
      mode?: 'in' | 'not_in';
      anyOf: Array<{
        projectId: string;
        /** When set with empty `columnIds`, match any column on this CRM tab. */
        boardId?: string;
        /** Empty / omitted = any column in the project (or board, if `boardId` is set) */
        columnIds?: string[];
      }>;
    }
  /**
   * Match conversation chat type. Use with other clauses under `all` for group-only
   * or direct-only automations. Rules with no `chat_type` node match **direct only**
   * (legacy-safe default enforced in the evaluator).
   */
  | { type: 'chat_type'; value: 'direct' | 'group' | 'any' }
  /**
   * Match when the inbound message's conversation is one of these WhatsApp
   * group conversation ids (or, with `mode: 'not_in'`, none of them).
   */
  | { type: 'from_group_in'; mode?: 'in' | 'not_in'; groupIds: string[] }
  /**
   * Match when the inbound contact's phone is one of these numbers (digit-only
   * comparison with national/E.164 suffix variants, same matcher used for CRM
   * phone custom fields). `mode: 'not_in'` inverts the match.
   */
  | { type: 'from_phone_in'; mode?: 'in' | 'not_in'; phones: string[] }
  /**
   * Inbound came from a Click-to-WhatsApp ad (Cloud API sessions only; Baileys never
   * matches). `campaign_in` needs the Meta Ads integration (campaign ids are enriched).
   */
  | {
      type: 'from_ad';
      match?: 'any' | 'ad_in' | 'campaign_in' | 'headline_contains';
      adIds?: string[];
      campaignIds?: string[];
      value?: string;
      caseInsensitive?: boolean;
      /** `current_message` (default): only the message with the referral; `conversation`: any message of an ad-attributed chat. */
      scope?: 'current_message' | 'conversation';
    }
  | {
      type: 'instagram_comment';
      postScope: 'all' | 'selected';
      postIds?: string[];
      /** Match comment body. Empty / omitted = any text. */
      textContains?: string;
      textNotContains?: string;
      caseInsensitive?: boolean;
    };

/** Weekday schedule of the workspace (`workspace.businessHours` in JSYNQ). */
export type BusinessHours = {
  enabled: boolean;
  timezone: string;
  schedule: Array<{ day: 0 | 1 | 2 | 3 | 4 | 5 | 6; windows: Array<{ start: string; end: string }> }>;
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const toMinutes = (v: string) => {
  const m = TIME_RE.exec(v.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** True when `at` is inside the workspace's business hours; hours off or not configured = always open. */
export function isWithinBusinessHours(config: BusinessHours | null | undefined, at: Date = new Date()): boolean {
  if (!config?.enabled) return true;
  const schedule = Array.isArray(config.schedule) ? config.schedule : [];
  const open = (d?: BusinessHours['schedule'][number]) => !!d?.windows?.some((w) => w.start && w.end);
  if (!schedule.some(open)) return true;
  try {
    const tz = config.timezone?.trim() || 'UTC';
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz }).format(at);
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
    const today = schedule.find((d) => d.day === day);
    if (!open(today)) return false;
    const now = toMinutes(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(at));
    if (now == null) return false;
    return today!.windows.some((w) => {
      const s = toMinutes(w.start);
      const e = toMinutes(w.end);
      if (s == null || e == null || s === e) return false;
      return s < e ? now >= s && now <= e : now >= s || now <= e; // overnight window
    });
  } catch {
    return true;
  }
}

/** Stable 0-99 bucket for a key (A/B splits must not flip between messages). */
export function splitBucket(key: string): number {
  return createHash('sha1').update(key).digest().readUInt32BE(0) % 100;
}

export type ConditionContext = {
  text: string;
  /** True on the contact's first message of the conversation. */
  firstInbound?: boolean;
  at: Date;
  businessHours: BusinessHours | null;
  chatType?: 'direct' | 'group';
};

/**
 * Conditions this service can evaluate on its own: text, regex (screened), first message,
 * business hours, chat type and boolean composition. Conditions that read JSYNQ data or call a
 * model (`llm_*`, `new_lead`, `linked_card_in`, `event_date_days_ahead`, `from_*`,
 * `instagram_comment`) need JSYNQ context or a model, and JSYNQ has no endpoint to evaluate them:
 * they do not match (see docs/jsynq-dependencies.md §2.4).
 */
export const LOCAL_CONDITION_TYPES = new Set(['all', 'any', 'first_inbound', 'contains', 'not_contains', 'regex', 'within_business_hours', 'outside_business_hours', 'chat_type']);

export function evaluateLocalCondition(condition: AutomationCondition, ctx: ConditionContext): boolean {
  const norm = (s: string, ci?: boolean) => (ci === false ? s : s.toLowerCase());
  switch (condition.type) {
    case 'all':
      return (condition.clauses ?? []).every((c) => evaluateLocalCondition(c, ctx));
    case 'any':
      return (condition.clauses ?? []).some((c) => evaluateLocalCondition(c, ctx));
    case 'first_inbound':
      return ctx.firstInbound === true;
    case 'contains':
      return norm(ctx.text, condition.caseInsensitive).includes(norm(condition.value ?? '', condition.caseInsensitive));
    case 'not_contains':
      return !norm(ctx.text, condition.caseInsensitive).includes(norm(condition.value ?? '', condition.caseInsensitive));
    case 'regex':
      if (regexPatternProblem(condition.pattern)) return false;
      return new RegExp(condition.pattern, 'i').test(ctx.text.slice(0, 8000));
    case 'within_business_hours':
      return isWithinBusinessHours(ctx.businessHours, ctx.at);
    case 'outside_business_hours':
      return !isWithinBusinessHours(ctx.businessHours, ctx.at);
    case 'chat_type':
      return condition.value === 'any' || (ctx.chatType ?? 'direct') === condition.value;
    default:
      return false;
  }
}

/** Save-time shape check of a condition tree (non-blocking issues: a draft may hold them). */
export function conditionShapeIssues(condition: unknown, path: string): Array<{ path: string; message: string }> {
  const issues: Array<{ path: string; message: string }> = [];
  const walk = (c: unknown, depth: number) => {
    if (!c || typeof c !== 'object') return issues.push({ path, message: 'condition must be an object' });
    const node = c as { type?: unknown; clauses?: unknown; value?: unknown; pattern?: unknown; labels?: unknown; match?: unknown };
    if (depth > 10) return issues.push({ path, message: 'condition is nested too deeply' });
    switch (node.type) {
      case 'all':
      case 'any':
        if (!Array.isArray(node.clauses) || node.clauses.length === 0) issues.push({ path, message: `${node.type} needs at least one clause` });
        else node.clauses.forEach((x) => walk(x, depth + 1));
        return;
      case 'contains':
      case 'not_contains':
        if (typeof node.value !== 'string' || !node.value.trim()) issues.push({ path, message: `${node.type} needs a value` });
        return;
      case 'regex':
        if (typeof node.pattern !== 'string' || !node.pattern) issues.push({ path, message: 'regex needs a pattern' });
        return;
      case 'llm_match':
      case 'llm_conversation_match':
        if (!Array.isArray(node.labels) || node.labels.length < 2) issues.push({ path, message: 'needs at least two labels' });
        else if (typeof node.match !== 'string' || !node.labels.includes(node.match)) issues.push({ path, message: 'match must be one of the labels' });
        return;
      case 'first_inbound':
      case 'new_lead':
      case 'event_date_days_ahead':
      case 'within_business_hours':
      case 'outside_business_hours':
      case 'linked_card_in':
      case 'chat_type':
      case 'from_group_in':
      case 'from_phone_in':
      case 'from_ad':
      case 'instagram_comment':
        return;
      default:
        issues.push({ path, message: 'unknown condition type' });
    }
  };
  walk(condition, 0);
  return issues;
}
