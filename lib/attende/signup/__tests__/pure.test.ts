import { isTerminalTrialError, sendsBackToAccountStep, signupErrorKey } from "../errors"
import { DEFAULT_TRIAL, formatSignupPrice, normalizePlanSlug, parseSignupPlans, pickMonthlyPrice, preferredCurrency } from "../plans"
import { hasErrors, isStrongEnoughPassword, passwordContainsName, resendCooldownLeft, sanitizeOtp, validateSignupAccount } from "../validate"

describe("signupErrorKey", () => {
  it("maps every known reference to its own message", () => {
    expect(signupErrorKey("SIGNUP_PAYMENT_FAILED")).toBe("errSIGNUP_PAYMENT_FAILED")
    expect(signupErrorKey("SIGNUP_TRIAL_ALREADY_USED")).toBe("errSIGNUP_TRIAL_ALREADY_USED")
  })
  it("falls back on the status, then on a generic message", () => {
    expect(signupErrorKey("SOMETHING_NEW", 429)).toBe("errSIGNUP_RATE_LIMITED")
    expect(signupErrorKey(undefined, 0)).toBe("errSIGNUP_NETWORK")
    expect(signupErrorKey(undefined, 500)).toBe("errSIGNUP_GENERIC")
  })
  it("knows which errors send the user back or end the retry loop", () => {
    expect(sendsBackToAccountStep("SIGNUP_NOT_FOUND")).toBe(true)
    expect(sendsBackToAccountStep("SIGNUP_OTP_INVALID")).toBe(false)
    expect(isTerminalTrialError("SIGNUP_TRIAL_ALREADY_USED")).toBe(true)
    expect(isTerminalTrialError("SIGNUP_PAYMENT_FAILED")).toBe(false)
  })
})

describe("plans", () => {
  it("normalizes the ?plan= param", () => {
    expect(normalizePlanSlug("growth")).toBe("attende_growth")
    expect(normalizePlanSlug("ATTENDE_SCALE")).toBe("attende_scale")
    expect(normalizePlanSlug("nope")).toBe("attende_starter")
    expect(normalizePlanSlug(undefined)).toBe("attende_starter")
  })

  it("parses the contract and drops malformed rows", () => {
    const parsed = parseSignupPlans({
      trial: { days: 7, requiresCard: true, outboundCap: 50 },
      plans: [
        { slug: "attende_starter", name: "Starter", limits: { lines: 1 }, prices: [{ currency: "BRL", interval: "month", amount: 19700 }, { currency: "brl", interval: "year", amount: 190000 }, { currency: 1 }] },
        { slug: "other", name: "x" },
        null,
      ],
    })
    expect(parsed.plans).toHaveLength(1)
    expect(parsed.plans[0]).toMatchObject({ slug: "attende_starter", tier: "starter", name: "Starter" })
    expect(parsed.plans[0]!.prices).toHaveLength(2)
    expect(parsed.trial).toEqual({ days: 7, requiresCard: true, outboundCap: 50 })
  })

  it("falls back on the documented trial defaults for an empty or odd payload", () => {
    expect(parseSignupPlans(null)).toEqual({ trial: DEFAULT_TRIAL, plans: [] })
    expect(parseSignupPlans({ plans: "no" }).plans).toEqual([])
  })

  it("picks the monthly price in the preferred currency, else any monthly price", () => {
    const { plans } = parseSignupPlans({
      plans: [{ slug: "attende_growth", prices: [{ currency: "usd", interval: "month", amount: 9900 }, { currency: "brl", interval: "month", amount: 49700 }, { currency: "brl", interval: "year", amount: 1 }] }],
    })
    expect(pickMonthlyPrice(plans[0], "brl")?.amount).toBe(49700)
    expect(pickMonthlyPrice(plans[0], "eur")?.amount).toBe(9900)
    expect(pickMonthlyPrice(undefined, "brl")).toBeNull()
    expect(preferredCurrency("portuguese")).toBe("brl")
    expect(preferredCurrency("english")).toBe("usd")
    expect(formatSignupPrice({ currency: "usd", interval: "month", amount: 9900 }, "en-US")).toBe("$99")
  })
})

describe("validateSignupAccount", () => {
  const ok = { name: "Maria Silva", email: "maria@empresa.com.br", password: "Segura#1", businessName: "Clínica Sorriso", acceptedTerms: true }

  it("accepts a valid form", () => {
    expect(hasErrors(validateSignupAccount(ok))).toBe(false)
  })
  it("flags each invalid field with its own message key", () => {
    const errors = validateSignupAccount({ name: "", email: "x", password: "abc", businessName: "", acceptedTerms: false })
    expect(errors).toEqual({
      name: "signupFieldRequired",
      email: "signupEmailInvalid",
      password: "signupPasswordInvalid",
      businessName: "signupFieldRequired",
      acceptedTerms: "signupTermsRequired",
    })
  })
  it("applies the backend password rules, including the name rule without accents", () => {
    expect(isStrongEnoughPassword("abc12!")).toBe(true)
    expect(isStrongEnoughPassword("abcdef")).toBe(false)
    expect(isStrongEnoughPassword("abc123")).toBe(false)
    expect(passwordContainsName("josé#99x", "Jose Santos")).toBe(true)
    expect(passwordContainsName("Outra#1", "Jo Li")).toBe(false)
    expect(validateSignupAccount({ ...ok, password: "Maria#123" }).password).toBe("errSIGNUP_PASSWORD_CONTAINS_NAME")
  })
})

describe("otp helpers", () => {
  it("keeps six digits from a pasted string", () => {
    expect(sanitizeOtp(" 123 456 789")).toBe("123456")
    expect(sanitizeOtp("12-34")).toBe("1234")
  })
  it("counts the resend cooldown down to zero", () => {
    expect(resendCooldownLeft(0, 0)).toBe(60)
    expect(resendCooldownLeft(0, 59_100)).toBe(1)
    expect(resendCooldownLeft(0, 61_000)).toBe(0)
  })
})
