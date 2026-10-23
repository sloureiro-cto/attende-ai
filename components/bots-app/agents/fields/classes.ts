/** One look for every text control of the agent forms: visible border, white surface, green focus ring. */
export const controlClass =
  "w-full rounded-xl border border-neutral-100 bg-white px-3.5 py-3 text-body-14 text-neutral-900 shadow-sm placeholder:text-neutral-400 transition-colors hover:border-neutral-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-neutral-10 disabled:text-neutral-500 aria-[invalid=true]:border-error aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-error/20"

export const chipClass =
  "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-body-13 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"

export const fieldId = (path: string) => `agent-field-${path.replace(/[^a-zA-Z0-9]+/g, "-")}`
