"use client"

import { Warning2 } from "iconsax-react"
import Link from "next/link"
import { FormEvent, useState } from "react"
import Button from "components/Button/Button"
import { Checkbox } from "components/Checkbox/Checkbox"
import TextInput from "components/TextInput/TextInput"
import { AttendePlanSlug, SignupPlan } from "lib/attende/signup/plans"
import { hasErrors, SignupAccountErrors, SignupAccountValues, validateSignupAccount } from "lib/attende/signup/validate"
import { PlanChoice } from "./PlanChoice"
import { useAcquisitionT } from "../acquisition/useAcquisitionT"
import { BOTS_ROUTES } from "../brand"
import { existingAccountSignInUrl } from "lib/attende/signup/errors"

type Props = {
  plans: SignupPlan[]
  planSlug: AttendePlanSlug
  onPlanChange: (slug: AttendePlanSlug) => void
  initial: Pick<SignupAccountValues, "name" | "email" | "businessName">
  /** Backend/server error already mapped to a message. */
  error: string | null
  emailInUse: boolean
  isLoading: boolean
  onSubmit: (values: SignupAccountValues) => void
}

export function SignupAccountStep({ plans, planSlug, onPlanChange, initial, error, emailInUse, isLoading, onSubmit }: Props) {
  const { t } = useAcquisitionT()
  const [values, setValues] = useState<SignupAccountValues>({ ...initial, password: "", acceptedTerms: false })
  const [errors, setErrors] = useState<SignupAccountErrors>({})
  const set = <K extends keyof SignupAccountValues>(key: K, value: SignupAccountValues[K]) => setValues((prev) => ({ ...prev, [key]: value }))
  const message = (key?: keyof SignupAccountErrors) => (key && errors[key] ? t(errors[key]!) : null)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = validateSignupAccount(values)
    setErrors(found)
    if (!hasErrors(found)) onSubmit(values)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-[10px] border border-error-lighter bg-error-clean px-3.5 py-3 text-body-13 text-error-darkest">
          <Warning2 size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            {error}
            {emailInUse && (
              <>
                {" "}
                <Link href={existingAccountSignInUrl(planSlug)} className="font-semibold underline">
                  {t("signupSignIn")}
                </Link>
              </>
            )}
          </span>
        </div>
      )}

      <TextInput label={t("signupName")} name="name" aria-label={t("signupName")} autoComplete="name" value={values.name} error={message("name")} onChange={(e) => set("name", e.target.value)} hideRequiredMark required />
      <TextInput label={t("signupEmail")} name="email" type="email" aria-label={t("signupEmail")} autoComplete="email" value={values.email} error={message("email")} onChange={(e) => set("email", e.target.value)} hideRequiredMark required />
      <TextInput
        label={t("signupPassword")}
        name="password"
        type="password"
        aria-label={t("signupPassword")}
        autoComplete="new-password"
        value={values.password}
        error={message("password")}
        helperText={errors.password ? undefined : t("signupPasswordHint")}
        onChange={(e) => set("password", e.target.value)}
        hideRequiredMark
        required
      />
      <TextInput label={t("signupBusiness")} name="businessName" aria-label={t("signupBusiness")} autoComplete="organization" value={values.businessName} error={message("businessName")} onChange={(e) => set("businessName", e.target.value)} hideRequiredMark required />

      <div className="flex flex-col gap-2">
        <span className="text-body-13 font-semibold text-neutral-900">{t("signupPlan")}</span>
        <PlanChoice value={planSlug} onChange={onPlanChange} plans={plans} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex cursor-pointer items-start gap-2.5">
          <Checkbox size="medium" checked={values.acceptedTerms} onCheckedChange={(checked) => set("acceptedTerms", checked === true)} aria-label={t("signupTerms")} className="mt-0.5" />
          <span className="text-body-13 text-neutral-700">{t("signupTerms")}</span>
        </label>
        {errors.acceptedTerms && <span className="text-body-12 text-error">{t(errors.acceptedTerms)}</span>}
      </div>

      <Button type="submit" size="large" loading={isLoading} className="h-11 w-full">
        {t("signupSubmit")}
      </Button>

      <p className="text-center text-body-13 text-neutral-500">
        {t("signupHaveAccount")}{" "}
        <Link href={BOTS_ROUTES.login} className="font-semibold text-primary-dark hover:underline">
          {t("signupSignIn")}
        </Link>
      </p>
    </form>
  )
}
