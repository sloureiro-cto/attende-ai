import { cn } from "@/lib/utils"

type Variant = "primary" | "secondary" | "ghost"
type Size = "sm" | "md" | "lg"

const BASE =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold no-underline " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "active:scale-[0.98] motion-reduce:transform-none " +
  // Disabled actions ignore the pointer, so they never show a hover or pressed state.
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50"

/*
 * Every pair here holds 4.5:1 in both themes: `primary-dark` is the deep emerald in light mode and the
 * pale one in dark mode, and `text-white` resolves to the raised surface in dark mode.
 */
const VARIANT: Record<Variant, string> = {
  primary:
    "border border-primary-dark bg-primary-dark text-white shadow-sm " +
    "hover:border-primary-darkest hover:bg-primary-darkest hover:shadow-md active:shadow-none",
  secondary:
    "border border-neutral-100 bg-white text-neutral-800 shadow-sm " +
    "hover:border-neutral-200 hover:bg-neutral-10 hover:text-neutral-900 active:bg-neutral-50",
  ghost:
    "border border-transparent bg-transparent text-neutral-600 " +
    "hover:bg-neutral-10 hover:text-neutral-900 active:bg-neutral-50",
}

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-body-13",
  md: "h-10 px-4 text-body-14",
  lg: "h-11 px-5 text-body-14",
}

/**
 * Class names for the actions of every bots-app screen (buttons and links that look like buttons),
 * with explicit hover, focus and pressed states. Links get the same look so a `<Link>` never wraps a `<button>`.
 */
export function actionClass({
  variant = "primary",
  size = "md",
  block = false,
  className,
}: { variant?: Variant; size?: Size; block?: boolean; className?: string } = {}) {
  return cn(BASE, VARIANT[variant], SIZE[size], block && "w-full", className)
}
