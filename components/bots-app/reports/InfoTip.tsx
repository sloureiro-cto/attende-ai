"use client"

import { InfoCircle } from "iconsax-react"
import { Popover, PopoverContent, PopoverTrigger } from "components/ui/popover"

type Props = {
  /** "What does <metric> mean?" */
  ariaLabel: string
  children: string
}

/** The exact definition of a number, on demand. A button (not a hover title) so touch and keyboard users get it too. */
export function InfoTip({ ariaLabel, children }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className="inline-flex size-6 items-center justify-center rounded-full text-neutral-500 transition-colors hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          <InfoCircle size={15} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 text-body-13 leading-relaxed text-neutral-700">
        {children}
      </PopoverContent>
    </Popover>
  )
}
