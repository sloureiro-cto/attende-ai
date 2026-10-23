import type { AttendePlanSlug } from "lib/attende/signup/plans"

export type SignupStep = "account" | "otp" | "card"

/** Everything the flow remembers between steps, except the password (kept in a ref, never in state or storage). */
export type SignupState = {
  step: SignupStep
  name: string
  email: string
  businessName: string
  planSlug: AttendePlanSlug
}

export type SignupAction =
  | { type: "account_created"; name: string; email: string; businessName: string; planSlug: AttendePlanSlug }
  | { type: "email_verified" }
  | { type: "back_to_account" }

export const initialSignupState = (planSlug: AttendePlanSlug): SignupState => ({
  step: "account",
  name: "",
  email: "",
  businessName: "",
  planSlug,
})

export function signupReducer(state: SignupState, action: SignupAction): SignupState {
  switch (action.type) {
    case "account_created":
      return { step: "otp", name: action.name, email: action.email, businessName: action.businessName, planSlug: action.planSlug }
    case "email_verified":
      return state.step === "otp" ? { ...state, step: "card" } : state
    case "back_to_account":
      return { ...state, step: "account" }
  }
}

export const SIGNUP_STEPS: readonly SignupStep[] = ["account", "otp", "card"]
export const stepIndex = (step: SignupStep): number => SIGNUP_STEPS.indexOf(step)
