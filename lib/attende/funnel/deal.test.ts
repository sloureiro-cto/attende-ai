import { commentFromHtml, commentToHtml, isDealRef, parseMoneyInput, patchRowsContact, toChecklistItems, toDealComment, validateContactDraft, withOwner } from "./deal"
import { id, row } from "./fixtures"

describe("validateContactDraft", () => {
  it("trims, lower-cases the e-mail and allows blank phone / e-mail", () => {
    expect(validateContactDraft({ name: "  Ana ", phone: "", email: " ANA@X.COM " })).toEqual({ ok: true, value: { name: "Ana", phone: "", email: "ana@x.com" } })
  })
  it("points at the wrong field", () => {
    expect(validateContactDraft({ name: " ", phone: "", email: "" })).toEqual({ ok: false, field: "name" })
    expect(validateContactDraft({ name: "Ana", phone: "abc", email: "" })).toEqual({ ok: false, field: "phone" })
    expect(validateContactDraft({ name: "Ana", phone: "+55 (11) 90000-0001", email: "nope" })).toEqual({ ok: false, field: "email" })
    expect(validateContactDraft({ name: "a".repeat(201), phone: "", email: "" })).toEqual({ ok: false, field: "name" })
  })
})

describe("parseMoneyInput", () => {
  it.each([
    ["1500", 1500],
    ["1.500,00", 1500],
    ["1,500.50", 1500.5],
    ["12,5", 12.5],
    ["12.50", 12.5],
    ["1.234", 1234],
    ["0.125", 0.13],
    ["R$ 99", 99],
    ["", 0],
  ])("%s -> %s", (raw, value) => expect(parseMoneyInput(raw)).toBe(value))
  it.each(["abc", "-5", "1.2.3,4,5"])("refuses %s", (raw) => expect(parseMoneyInput(raw)).toBeNull())
})

describe("comments", () => {
  it("stores plain text as escaped paragraphs and reads it back", () => {
    const html = commentToHtml("<b>hi</b> & bye\nline 2")
    expect(html).toBe("<p>&lt;b&gt;hi&lt;/b&gt; &amp; bye</p><p>line 2</p>")
    expect(commentFromHtml(html)).toBe("<b>hi</b> & bye\nline 2")
    expect(commentFromHtml('<p>a<br/>b</p><img src=x onerror="alert(1)">')).toBe("a\nb")
  })
  it("marks the caller's own comments and reads populated authors", () => {
    const c = toDealComment({ _id: id(1), text: "<p>x</p>", author: { _id: id(2), name: "Bruno", image: "https://a/b.png" }, createdAt: "2026-10-01T00:00:00.000Z" }, id(2))
    expect(c).toEqual({ id: id(1), text: "x", authorName: "Bruno", authorAvatar: "https://a/b.png", createdAt: "2026-10-01T00:00:00.000Z", mine: true })
    expect(toDealComment({ _id: id(1), text: "x", author: id(3) }, id(2), "Fallback")).toMatchObject({ mine: false, authorName: "Fallback" })
  })
})

describe("checklist and deal helpers", () => {
  it("keeps the direct, non-deleted children in CRM order", () => {
    const cards = [
      { _id: id(11), title: "b", parent: id(1), subtaskHierarchyOrder: 20, completed: true },
      { _id: id(12), title: "a", parent: { _id: id(1) }, subtaskHierarchyOrder: 10 },
      { _id: id(13), title: "grandchild", parent: id(11) },
      { _id: id(14), title: "gone", parent: id(1), deleted: true },
    ]
    expect(toChecklistItems(cards, id(1))).toEqual([
      { id: id(12), title: "a", done: false },
      { id: id(11), title: "b", done: true },
    ])
    expect(toChecklistItems(null, id(1))).toEqual([])
  })
  it("puts the owner first and drops it on unassign", () => {
    expect(withOwner([id(1), id(2)], id(2))).toEqual([id(2), id(1)])
    expect(withOwner([id(1), id(2)], id(3))).toEqual([id(3), id(1), id(2)])
    expect(withOwner([id(1), id(2)], null)).toEqual([id(2)])
  })
  it("validates deal refs", () => {
    expect(isDealRef({ projectId: id(1), boardId: id(2), cardId: id(3) })).toBe(true)
    expect(isDealRef({ projectId: "x", boardId: id(2), cardId: id(3) })).toBe(false)
  })
  it("updates every row of an edited contact, keeping a masked phone", () => {
    const rows = [row(1), row(2, { contact: { ...row(1).contact! } }), row(3)]
    const next = patchRowsContact(rows, row(1).contact!.id, { name: "New", phone: "+1 555 0100", email: "" }, true)
    expect(next.map((r) => r.contact?.name)).toEqual(["New", "New", "Ana 3"])
    expect(next[0]!.contact).toMatchObject({ email: null, phone: row(1).contact!.phone })
    expect(patchRowsContact(rows, id(999), { name: "x", phone: "", email: "" }, false)).toBe(rows)
  })
})
