import { initialSignupState, signupReducer, stepIndex } from "./signupState"

describe("signupReducer", () => {
  const created = { type: "account_created", name: "Maria", email: "m@x.com", businessName: "Clínica", planSlug: "attende-profissional" } as const

  it("moves account -> otp -> card keeping what the user typed", () => {
    const afterAccount = signupReducer(initialSignupState("attende-essencial"), created)
    expect(afterAccount).toEqual({ step: "otp", name: "Maria", email: "m@x.com", businessName: "Clínica", planSlug: "attende-profissional" })
    expect(signupReducer(afterAccount, { type: "email_verified" }).step).toBe("card")
  })

  it("ignores a verification that arrives outside the otp step", () => {
    const initial = initialSignupState("attende-essencial")
    expect(signupReducer(initial, { type: "email_verified" })).toBe(initial)
  })

  it("goes back to the account step without losing the data", () => {
    const back = signupReducer(signupReducer(initialSignupState("attende-essencial"), created), { type: "back_to_account" })
    expect(back).toMatchObject({ step: "account", email: "m@x.com" })
  })

  it("orders the steps for the progress indicator", () => {
    expect(["account", "otp", "card"].map((s) => stepIndex(s as "account"))).toEqual([0, 1, 2])
  })
})
