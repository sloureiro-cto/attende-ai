import type { VisualAction, VisualRule, VisualWhen } from "./whatsappTemplateRuleBuilder"

export type ExtraActionLane =
  | { kind: "else"; actions: VisualAction[] }
  | { kind: "label"; label: string; actions: VisualAction[] }

export function llmLabelList(when: VisualWhen): string[] {
  const seen = new Set<string>()
  const labels: string[] = []
  for (const part of (when.llmLabelsText ?? "").split(",")) {
    const label = part.trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    labels.push(label)
  }
  return labels
}

function actionsForLabel(rule: VisualRule, label: string): VisualAction[] {
  const map = rule.labelActions
  if (!map) return []
  if (map[label]?.length) return map[label]!
  const lower = label.toLowerCase()
  for (const [key, actions] of Object.entries(map)) {
    if (key.toLowerCase() === lower && actions?.length) return actions
  }
  return map[label] ?? []
}

/**
 * Paths besides the matching one.
 * A classifier gets one row per other label, plus Otherwise for no match.
 * Every other condition gets a single Otherwise row.
 */
export function extraActionLanes(rule: VisualRule): ExtraActionLane[] {
  if (rule.conditions.length === 0) return []
  if (rule.conditions.length === 1) {
    const when = rule.conditions[0]!
    if (when.type === "llm_match" || when.type === "llm_conversation_match") {
      const match = (when.llmMatch ?? "").trim().toLowerCase()
      const lanes: ExtraActionLane[] = []
      let hasElseLabel = false
      for (const label of llmLabelList(when)) {
        if (label.toLowerCase() === match) continue
        if (label.toLowerCase() === "else") {
          hasElseLabel = true
          lanes.push({ kind: "else", actions: rule.elseActions ?? [] })
          continue
        }
        lanes.push({ kind: "label", label, actions: actionsForLabel(rule, label) })
      }
      if (!hasElseLabel) lanes.push({ kind: "else", actions: rule.elseActions ?? [] })
      return lanes
    }
  }
  return [{ kind: "else", actions: rule.elseActions ?? [] }]
}

export function yesLaneTitle(rule: VisualRule): string | undefined {
  if (rule.conditions.length !== 1) return undefined
  const when = rule.conditions[0]!
  if (when.type !== "llm_match" && when.type !== "llm_conversation_match") return undefined
  const match = (when.llmMatch ?? "").trim()
  return match || undefined
}
