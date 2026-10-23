import { businessContext } from "../context"
import { cleanForm, validateField } from "../form"

describe("business context before activation", () => {
  it("needs a real description or a document already read", () => {
    expect(businessContext({ businessDescription: "short" }).enough).toBe(false)
    expect(businessContext({ businessDescription: "x".repeat(60) }).enough).toBe(true)
    expect(businessContext({}, [{ indexStatus: "processing" }])).toMatchObject({ enough: false, readingDocuments: 1 })
    expect(businessContext({}, [{ indexStatus: "ready" }])).toMatchObject({ enough: true, readyDocuments: 1 })
    expect(businessContext({}, [{ indexStatus: "failed" }]).enough).toBe(false)
  })
})

describe("offerings with a structured price", () => {
  const field = { path: "offerings", kind: "offerings" as const, label: { en: "", pt: "", es: "" }, max: 20 }

  it("flags a price the user has not finished", () => {
    const form = { offerings: [{ name: "Cleaning", price: "", __price: { mode: "fixed", currency: "", amount: "150", unit: "none", custom: "", problem: "currency" } }] }
    expect(validateField(field, form)).toEqual([{ path: "offerings", code: "price" }])
  })

  it("never sends the editor state", () => {
    const form = cleanForm({ offerings: [{ name: "Cleaning", price: "R$ 150,00", __price: { mode: "fixed" } }] })
    expect(form.offerings).toEqual([{ name: "Cleaning", price: "R$ 150,00" }])
  })
})
