import 'server-only';
import {
  firstUnsafeRegex,
  regexPatternProblem,
  regexPatternsInCondition,
} from './regexSafety';
import type {
  AdvancedAutomationNode,
  AdvancedAutomationTrigger,
} from '../types';
import type { AdvancedAutomationIssue } from './validateAdvancedAutomation';

/**
 * Regex conditions of an automation (trigger filter and condition steps), screened for patterns that can
 * take exponential time on the shared event loop. Blocking: such an automation is never stored.
 */
export function automationRegexIssues(automation: {
  nodes: AdvancedAutomationNode[];
  trigger?: AdvancedAutomationTrigger;
}): AdvancedAutomationIssue[] {
  const issues: AdvancedAutomationIssue[] = [];
  const check = (path: string, condition: unknown) => {
    for (const pattern of regexPatternsInCondition(condition as never)) {
      const problem = regexPatternProblem(pattern);
      if (problem)
        issues.push({
          path,
          message: `regex ${problem}`,
          blocking: true,
        });
    }
  };
  if (automation.trigger?.filter)
    check('trigger.filter', automation.trigger.filter);
  for (const node of automation.nodes ?? []) {
    if (node?.kind !== 'condition') continue;
    for (const row of node.rows ?? []) {
      check(`nodes[${node.id}].rows[${row.id}]`, row.condition);
    }
  }
  return issues;
}

export { firstUnsafeRegex };
