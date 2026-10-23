import { translateAttendeFunnel } from "lib/i18n/translations/attende/funnel"
import { defaultStageId, stageLabel } from "./stageNames"

const pt = (key: Parameters<typeof translateAttendeFunnel>[1]) => translateAttendeFunnel("portuguese", key)
const en = (key: Parameters<typeof translateAttendeFunnel>[1]) => translateAttendeFunnel("english", key)

describe("default stage names", () => {
  it("recognises the seeded names in the three seed languages, with their kind", () => {
    expect(defaultStageId({ name: "Em Negociação", kind: "open" })).toBe("negotiation")
    expect(defaultStageId({ name: "In Negotiation", kind: "open" })).toBe("negotiation")
    expect(defaultStageId({ name: "Ganho", kind: "won" })).toBe("won")
    expect(defaultStageId({ name: "Win", kind: "won" })).toBe("won")
    expect(defaultStageId({ name: "Lead Perdido", kind: "lost" })).toBe("lost")
    expect(defaultStageId({ name: "Leads", kind: "open" })).toBe("leads")
  })

  it("matches decomposed accents the same as composed ones", () => {
    expect(defaultStageId({ name: "Em Negociação".normalize("NFD"), kind: "open" })).toBe("negotiation")
  })

  it("treats anything else as the user's own text", () => {
    expect(defaultStageId({ name: "em negociação", kind: "open" })).toBeNull()
    expect(defaultStageId({ name: "Ganho ", kind: "won" })).toBeNull()
    expect(defaultStageId({ name: "Proposta enviada", kind: "open" })).toBeNull()
    // A default whose status was changed is no longer the seeded stage.
    expect(defaultStageId({ name: "Ganho", kind: "open" })).toBeNull()
    expect(defaultStageId(null)).toBeNull()
  })

  it("translates the defaults to the user's language and keeps custom names as written", () => {
    expect(stageLabel({ name: "In Negotiation", kind: "open" }, pt)).toBe("Em negociação")
    expect(stageLabel({ name: "Ganho", kind: "won" }, en)).toBe("Won")
    expect(stageLabel({ name: "Lead Perdido", kind: "lost" }, en)).toBe("Lost lead")
    expect(stageLabel({ name: "Visita agendada", kind: "open" }, en)).toBe("Visita agendada")
  })
})
