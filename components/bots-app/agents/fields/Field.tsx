import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { fieldId } from "./classes"

type Props = {
  path: string
  label: string
  help?: string
  error?: string | null
  required?: boolean
  optionalText: string
  /** Shown instead of "Optional" for answers that are optional now but needed before turning the agent on. */
  laterText?: string
  /** Radio-like groups render their own labels. */
  asGroup?: boolean
  children: ReactNode
  className?: string
}

/** Label, help text and error message around a control. The error is announced and linked to the control. */
export function Field({ path, label, help, error, required, optionalText, laterText, asGroup = false, children, className }: Props) {
  const id = fieldId(path)
  const Label = asGroup ? "legend" : "label"
  const Wrapper = asGroup ? "fieldset" : "div"
  return (
    <Wrapper id={asGroup ? id : undefined} tabIndex={asGroup ? -1 : undefined} className={cn("flex min-w-0 flex-col gap-1.5 focus:outline-none", className)}>
      <Label {...(asGroup ? {} : { htmlFor: id })} className="text-body-14 font-semibold text-neutral-900">
        {label}
        {!required && laterText ? (
          <span className="ml-1.5 rounded-full bg-warning-clean px-2 py-0.5 text-body-12 font-medium text-warning-darkest">{laterText}</span>
        ) : (
          !required && <span className="ml-1.5 text-body-12 font-normal text-neutral-500">({optionalText})</span>
        )}
      </Label>
      {help && (
        <p id={`${id}-help`} className="text-body-13 text-neutral-600">
          {help}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-body-13 font-medium text-error-dark">
          {error}
        </p>
      )}
    </Wrapper>
  )
}
