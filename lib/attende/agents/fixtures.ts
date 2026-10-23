import type { AgentTemplate, AgentView } from "./types"

/** Small, contract-shaped samples for tests and stories. Not imported by app code. */
const L = (en: string) => ({ en, pt: en, es: en })

export const sdrTemplateFixture: AgentTemplate = {
  key: "sdr",
  category: "sales",
  name: L("Lead qualifier"),
  tagline: L("Qualifies new leads"),
  description: L("Asks the right questions"),
  highlights: [L("Fast first answer")],
  steps: [
    {
      key: "business",
      title: L("About your business"),
      fields: [
        { path: "businessName", kind: "text", label: L("Business name"), required: true, max: 80 },
        { path: "businessDescription", kind: "textarea", label: L("What the business does"), max: 800 },
        { path: "offerings", kind: "offerings", label: L("Products or services"), max: 20 },
        { path: "assistantName", kind: "text", label: L("Agent name"), max: 40 },
        {
          path: "language",
          kind: "select",
          label: L("Main language"),
          options: [
            { value: "pt", label: L("Portuguese") },
            { value: "en", label: L("English") },
          ],
        },
        {
          path: "tone",
          kind: "select",
          label: L("Tone"),
          required: true,
          options: [
            { value: "friendly", label: L("Friendly") },
            { value: "formal", label: L("Formal") },
          ],
        },
        { path: "disclosure", kind: "boolean", label: L("Say it is a virtual assistant") },
      ],
    },
    {
      key: "qualify",
      title: L("How to qualify"),
      fields: [
        { path: "sdr.qualificationQuestions", kind: "list", label: L("Questions to ask"), required: true, max: 5, itemMax: 200 },
        { path: "workingHours", kind: "workingHours", label: L("Working hours") },
        { path: "handoff.triggers", kind: "list", label: L("Call a person when"), max: 10 },
        { path: "handoff.keywords", kind: "list", label: L("Words that call a person"), max: 15 },
        {
          path: "handoff.target",
          kind: "select",
          informational: true,
          label: L("Who takes over"),
          options: [
            { value: "team", label: L("The whole team") },
            { value: "user", label: L("A specific person") },
          ],
        },
        { path: "maxRepliesPerContactPerDay", kind: "number", label: L("Replies per contact per day"), min: 5, max: 200 },
      ],
    },
  ],
  defaults: { tone: "friendly", language: "en", disclosure: true, workingHours: null, handoff: { triggers: [], keywords: ["agent"] }, sdr: { goal: "qualify", qualificationQuestions: [] } },
  channels: [
    { key: "whatsapp", available: true, beta: false },
    { key: "instagram", available: false, beta: true },
  ],
}

export const receptionistTemplateFixture: AgentTemplate = {
  ...sdrTemplateFixture,
  key: "receptionist",
  category: "support",
  name: L("Receptionist"),
  steps: [
    { key: "business", title: L("About your business"), fields: [{ path: "businessName", kind: "text", label: L("Business name"), required: true, max: 80 }] },
    { key: "faqs", title: L("Questions"), fields: [{ path: "receptionist.faqs", kind: "faqs", label: L("Questions and answers"), max: 30 }] },
  ],
  defaults: { language: "en" },
}

export const agentViewFixture = (over: Partial<AgentView> = {}): AgentView => ({
  id: "a1",
  agentId: "jsynq-a1",
  templateKey: "sdr",
  name: "SDR · Clinic",
  status: "paused",
  form: { businessName: "Clinic", businessDescription: "We clean, whiten and fix teeth for families in the city center, with evening hours.", assistantName: "Luna", tone: "friendly" },
  lines: [{ channel: "whatsapp", sessionId: "s1", label: "Main", exists: true, connected: true, active: false }],
  documents: [],
  lastTestPassedAt: null,
  liveSince: null,
  createdAt: "2026-10-20T10:00:00Z",
  updatedAt: "2026-10-21T10:00:00Z",
  ...over,
})
