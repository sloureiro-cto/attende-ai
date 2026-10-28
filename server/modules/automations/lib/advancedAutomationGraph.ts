import 'server-only';
import type { AdvancedAutomationNode } from '../types';

/**
 * The exits a node can leave through. Edges reference these ids, so the editor, the validator
 * and the engine all agree on them. Node-specific exits reuse the author's option/row/path ids.
 */
export function nodeOutputs(node: AdvancedAutomationNode): string[] {
  switch (node.kind) {
    case 'send_message': {
      const outs: string[] = [];
      if (node.replyMode === 'none') {
        outs.push('next');
      } else if (node.replyMode === 'free') {
        outs.push('answered');
      } else {
        outs.push(...(node.options ?? []).map((o) => o.id), 'other');
      }
      if (node.replyMode !== 'none' && node.noReplyMinutes)
        outs.push('no_reply');
      // Only a step that waits for a reply can route a delivery failure: with no reply expected
      // the engine has already moved on when the runtime tries to send (the run just fails).
      if (node.replyMode !== 'none') outs.push('send_failed');
      return outs;
    }
    case 'condition':
      return [...node.rows.map((r) => r.id), 'none'];
    case 'split':
      return [...node.paths.map((p) => p.id), 'else'];
    case 'ai_agent':
      return ['understood', 'not_understood'];
    case 'wait':
    case 'set_field':
    case 'move_stage':
    case 'add_label':
    case 'create_task':
    case 'webhook':
    case 'send_meta_template':
      return ['next'];
    case 'goto_automation':
    case 'stop':
    case 'handoff':
      return [];
  }
}
