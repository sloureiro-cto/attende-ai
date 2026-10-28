import 'server-only';
import type { AutomationCondition } from './conditions';

/**
 * `regex` conditions run with `new RegExp(pattern).test(text)` on the API/worker event loop, which
 * is shared by every workspace. A pattern like `(a+)+$` takes exponential time on a crafted
 * message, so one member could freeze the process for everyone. The legacy rule runners keep
 * accepting whatever they always accepted (their behaviour is deliberately untouched); the NEW
 * surfaces (simulator, automation preview, automation conditions) screen patterns with this conservative check.
 *
 * It is a heuristic, not a proof: it rejects the shapes that cause exponential backtracking
 * (a quantified group that itself contains an unbounded quantifier or an alternation) and
 * backreferences, and caps the length. Plain "contains"-style patterns, classes, anchors, bounded
 * repetition and non-quantified groups are all fine.
 */
export const REGEX_PATTERN_MAX_LENGTH = 200;

const UNBOUNDED = /^(?:\*|\+|\{\d+,\}|\{\d+,\})/;

export function regexPatternProblem(pattern: string): string | null {
  if (typeof pattern !== 'string') return 'must be text';
  if (pattern.length > REGEX_PATTERN_MAX_LENGTH) {
    return `is longer than ${REGEX_PATTERN_MAX_LENGTH} characters`;
  }
  try {
    new RegExp(pattern, 'i');
  } catch {
    return 'is not a valid pattern';
  }
  if (/\\[1-9]|\\k</.test(pattern)) return 'must not use backreferences';

  type Group = { hasUnbounded: boolean; hasAlternation: boolean };
  const stack: Group[] = [{ hasUnbounded: false, hasAlternation: false }];
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === '[') {
      i += 1;
      while (i < pattern.length && pattern[i] !== ']') {
        i += pattern[i] === '\\' ? 2 : 1;
      }
      i += 1;
      continue;
    }
    if (c === '(') {
      stack.push({ hasUnbounded: false, hasAlternation: false });
      i += 1;
      if (pattern[i] === '?') {
        // (?: (?= (?! (?<name> ... skip the group prefix
        i += 1;
        if (
          pattern[i] === '<' &&
          pattern[i + 1] !== '=' &&
          pattern[i + 1] !== '!'
        ) {
          while (i < pattern.length && pattern[i] !== '>') i += 1;
        }
        i += 1;
      }
      continue;
    }
    if (c === '|') {
      stack[stack.length - 1]!.hasAlternation = true;
      i += 1;
      continue;
    }
    if (c === ')') {
      const group = stack.length > 1 ? stack.pop()! : stack[0]!;
      const next = pattern.slice(i + 1);
      const quantifiedUnbounded = UNBOUNDED.test(next);
      if (quantifiedUnbounded && (group.hasUnbounded || group.hasAlternation)) {
        return 'can take exponential time (a repeated group that contains repetition or alternatives)';
      }
      if (quantifiedUnbounded || group.hasUnbounded) {
        stack[stack.length - 1]!.hasUnbounded = true;
      }
      i += 1;
      continue;
    }
    if (UNBOUNDED.test(pattern.slice(i))) {
      stack[stack.length - 1]!.hasUnbounded = true;
    }
    i += 1;
  }
  return null;
}

/** Every `regex` pattern inside a condition tree. */
export function regexPatternsInCondition(
  condition: AutomationCondition | undefined | null
): string[] {
  if (!condition || typeof condition !== 'object') return [];
  if (condition.type === 'regex') {
    return typeof condition.pattern === 'string' ? [condition.pattern] : [];
  }
  if (condition.type === 'all' || condition.type === 'any') {
    return (condition.clauses ?? []).flatMap(regexPatternsInCondition);
  }
  return [];
}

/** First unsafe pattern found, or null. */
export function firstUnsafeRegex(patterns: string[]): {
  pattern: string;
  problem: string;
} | null {
  for (const pattern of patterns) {
    const problem = regexPatternProblem(pattern);
    if (problem) return { pattern, problem };
  }
  return null;
}
