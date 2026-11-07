import { createBotNode, nodeIssues, nodeOutputs, pruneDanglingEdges, sanitizeNodePreset } from "../botGraph"
import { draftFromDetail, draftToInput } from "../botBuilderState"
import { parseKeywords, triggerIssues, withTriggerKind } from "../botTrigger"
import type { AdvancedAutomationDetail, AdvancedAutomationNode, AdvancedAutomationNodeKind } from "../types"

const hex = (c: string) => c.repeat(24)

/** An automation saved before the pack: no new kinds, set_field with only fieldId + value, the old trigger shape. */
const OLD: AdvancedAutomationDetail = {
  _id: hex("a"),
  id: hex("a"),
  name: "Boas-vindas",
  status: "active",
  channels: [{ channel: "whatsapp", enabledSessionIds: ["s1"] }],
  trigger: { kind: "new_conversation", dedupeDays: 0 },
  stopOnHumanReply: true,
  startNodeId: "ask",
  nodes: [
    { id: "ask", kind: "send_message", x: 0, y: 0, text: "Oi", replyMode: "free", noReplyMinutes: 10, saveAnswerTo: "orcamento" },
    { id: "pause", kind: "wait", x: 0, y: 1, minutes: 5 },
    { id: "sf", kind: "set_field", x: 0, y: 2, fieldId: "orcamento", value: "{{lead.name}}" },
    { id: "mv", kind: "move_stage", x: 0, y: 3, columnId: hex("c"), projectId: hex("d") },
    { id: "lb", kind: "add_label", x: 0, y: 4, labelText: "Quente" },
    { id: "ho", kind: "handoff", x: 0, y: 5, assignMode: "all_crm_members" },
  ],
  edges: [
    { id: "e1", from: "ask", output: "answered", to: "pause" },
    { id: "e2", from: "ask", output: "no_reply", to: "lb" },
    { id: "e3", from: "pause", output: "next", to: "sf" },
    { id: "e4", from: "sf", output: "next", to: "mv" },
    { id: "e5", from: "mv", output: "next", to: "ho" },
  ],
  version: 3,
  updatedAt: "2026-10-01T00:00:00.000Z",
  issues: [],
}

describe("old saved automations keep working", () => {
  it("keeps the same exits and no new issues", () => {
    expect(OLD.nodes.map((n) => [n.id, nodeOutputs(n)])).toEqual([
      ["ask", ["answered", "no_reply", "send_failed"]],
      ["pause", ["next"]],
      ["sf", ["next"]],
      ["mv", ["next"]],
      ["lb", ["next"]],
      ["ho", []],
    ])
    expect(OLD.nodes.flatMap(nodeIssues)).toEqual([])
    expect(pruneDanglingEdges(OLD.nodes, OLD.edges)).toEqual(OLD.edges)
    expect(triggerIssues(OLD.trigger)).toEqual([])
  })

  it("loads and saves without changing the graph or the trigger", () => {
    const input = draftToInput(draftFromDetail(OLD))
    expect(input.trigger).toEqual({ kind: "new_conversation", dedupeDays: 0 })
    expect(input.nodes).toEqual(OLD.nodes)
    expect(input.edges).toEqual(OLD.edges)
  })
})

describe("new steps", () => {
  const NEW_KINDS: AdvancedAutomationNodeKind[] = [
    "create_card",
    "duplicate_card",
    "delete_card",
    "move_board",
    "set_value",
    "set_owner",
    "remove_label",
    "add_comment",
    "add_checklist_item",
    "check_checklist_item",
    "mark_read",
    "assign_conversation",
    "save_reply",
    "wait_reply",
  ]

  it("have the server's exits", () => {
    for (const kind of NEW_KINDS) {
      expect(nodeOutputs(createBotNode(kind, 0, 0))).toEqual(kind === "wait_reply" ? ["answered", "no_reply"] : ["next"])
    }
  })

  it("flag what is missing; a delete must be confirmed", () => {
    const issues = (n: AdvancedAutomationNode) => nodeIssues(n)
    expect(issues(createBotNode("delete_card", 0, 0))).toEqual(["delete_not_confirmed"])
    expect(issues({ ...createBotNode("delete_card", 0, 0), confirmed: true } as AdvancedAutomationNode)).toEqual([])
    expect(issues(createBotNode("create_card", 0, 0))).toEqual(["column_missing"])
    expect(issues(createBotNode("set_owner", 0, 0))).toEqual(["user_missing"])
    expect(issues(createBotNode("assign_conversation", 0, 0))).toEqual(["user_missing"])
    expect(issues(createBotNode("save_reply", 0, 0))).toEqual(["field_missing"])
    expect(issues(createBotNode("add_comment", 0, 0))).toEqual(["text_missing"])
    expect(issues(createBotNode("mark_read", 0, 0))).toEqual([])
    expect(issues(createBotNode("wait_reply", 0, 0))).toEqual([])
    expect(issues(createBotNode("duplicate_card", 0, 0))).toEqual([])
  })

  it("presets keep only the fields of their kind", () => {
    expect(sanitizeNodePreset("delete_card", { confirmed: true, label: "x" })).toEqual({ label: "x" })
    expect(sanitizeNodePreset("wait_reply", { minutes: 5, evil: 1 })).toEqual({ minutes: 5 })
  })
})

describe("triggers", () => {
  it("need their settings before activation", () => {
    expect(triggerIssues({ kind: "keyword", dedupeDays: 0 })).toEqual(["keywords_missing"])
    expect(triggerIssues({ kind: "keyword", dedupeDays: 0, keywords: ["preço"] })).toEqual([])
    expect(triggerIssues({ kind: "card_stage_changed", dedupeDays: 0 })).toEqual(["stage_missing"])
    expect(triggerIssues({ kind: "card_won", dedupeDays: 0, projectId: hex("d"), boardId: hex("b") })).toEqual([])
    expect(triggerIssues({ kind: "contact_no_reply", dedupeDays: 0, minutes: 2 })).toEqual(["minutes_invalid"])
    expect(triggerIssues({ kind: "scheduled", dedupeDays: 0, columnId: hex("c"), schedule: { frequency: "weekly", time: "09:00" } })).toEqual(["schedule_invalid"])
    expect(triggerIssues({ kind: "date_field", dedupeDays: 0, projectId: hex("d"), boardId: hex("b"), dateField: { fieldId: "renovacao", offsetDays: -3, time: "08:30" } })).toEqual([])
  })

  it("changing the kind keeps the shared settings only", () => {
    const next = withTriggerKind({ kind: "keyword", dedupeDays: 3, keywords: ["a"], oncePerLead: true, filters: { labels: ["VIP"] } }, "team_no_reply")
    expect(next).toEqual({ kind: "team_no_reply", dedupeDays: 3, oncePerLead: true, filters: { labels: ["VIP"] }, minutes: 60 })
  })

  it("parses keywords", () => {
    expect(parseKeywords("preço, orçamento\n\n quanto custa ")).toEqual(["preço", "orçamento", "quanto custa"])
  })
})
