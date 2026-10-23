/** Shared typography for WhatsApp / SMS automation settings forms. */
export const waFieldLabelClass = "text-body-12 font-medium text-neutral-800"
export const waFieldHintClass = "text-body-10 text-neutral-500"
export const waToggleTitleClass = "text-body-14 cursor-pointer font-medium text-neutral-900"
export const waToggleHintClass = "text-body-12 text-neutral-500"

/** Page shell — full-width settings layout inside the workspace sidebar. */
export const waSettingsPageClass =
  "mx-auto flex w-full min-w-0 flex-1 flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:gap-6 lg:px-8 lg:py-8"

/** Cards & lists — neutral borders aligned with the rest of settings. */
export const waSettingsCardClass = "overflow-hidden rounded-xl border border-neutral-50 bg-white shadow-none"
export const waSettingsCardHeaderClass =
  "flex flex-col gap-3 space-y-0 border-b border-neutral-50 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:py-5"
export const waSettingsCardContentClass = "px-4 py-4 sm:px-5 sm:py-5"
export const waSettingsCardTitleClass = "text-body-16 font-semibold leading-snug text-neutral-900 sm:text-heading-18"
export const waSettingsCardDescriptionClass = "mt-1.5 max-w-3xl text-body-13 leading-relaxed text-neutral-500"

/** Nested list item card (e.g. agent binding row). */
export const waSettingsItemCardClass =
  "flex flex-col gap-3 rounded-lg border border-primary-lighter/70 bg-neutral-10/40 p-4 sm:flex-row sm:items-center sm:justify-between"
export const waSettingsItemCardIconClass =
  "flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-clean text-primary-darkest"

/** Toggle row inside a bordered panel. */
export const waSettingsTogglePanelClass =
  "flex items-start gap-3 rounded-lg border border-neutral-50 bg-white px-4 py-3.5"

/** Uppercase field labels in config forms. */
export const waSettingsFieldLabelClass =
  "mb-1.5 block text-body-10 font-semibold uppercase tracking-wide text-neutral-500"

/** Selected field chips (CRM sync, tags). */
export const waSettingsChipClass =
  "inline-flex items-center gap-1.5 rounded-full border border-primary-lighter bg-primary-clean px-2.5 py-1 text-body-11 font-medium text-primary-darkest"
export const waSettingsChipAddClass =
  "inline-flex items-center gap-1 rounded-full border border-neutral-50 bg-white px-2.5 py-1 text-body-11 font-medium text-neutral-600 transition-colors hover:bg-neutral-10"

/** Feature block with icon header (CRM sync card). */
export const waSettingsFeatureCardClass = "space-y-4 rounded-xl border border-neutral-50 bg-neutral-10/30 p-4 sm:p-5"
export const waSettingsFeatureIconClass =
  "flex size-9 shrink-0 items-center justify-center rounded-lg bg-info-clean text-info-darkest"
export const waSettingsListClass = "divide-y divide-neutral-50"
export const waSettingsListRowClass =
  "flex flex-wrap items-start gap-3 py-4 first:pt-0 last:pb-0 sm:items-center sm:justify-between"
export const waSettingsListRowMainClass = "min-w-0 flex-1"
export const waSettingsListRowActionsClass = "flex shrink-0 flex-wrap items-center gap-1 sm:gap-2"
export const waSettingsEmptyStateClass =
  "rounded-lg border border-dashed border-neutral-100 bg-neutral-10/50 px-4 py-10 text-center text-body-14 text-neutral-500"

/** Tab bar — scrollable underline tabs (matches members / billing settings). */
export const waSettingsTabBarClass = "relative -mx-4 border-b border-neutral-100 sm:mx-0"
export const waSettingsTabListClass =
  "flex min-w-0 gap-0 overflow-x-auto overscroll-x-contain px-4 scrollbar-none sm:px-0 [-webkit-overflow-scrolling:touch]"
export const waSettingsTabTriggerClass =
  "relative flex shrink-0 items-center gap-1 whitespace-nowrap px-4 py-2 text-body-14 font-normal text-neutral-500 transition-colors hover:text-neutral-800"
export const waSettingsTabTriggerActiveClass =
  "font-bold text-neutral-500 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-primary"

export const waSettingsTabDescriptionClass =
  "rounded-lg border border-neutral-50 bg-neutral-10/60 px-4 py-3 text-body-14 leading-relaxed text-neutral-600"

/** Sprint insights / dashboard AI highlight — gradient border + white inner card. */
export const waAiHighlightOuterClass = "min-w-0 rounded-lg p-px"
export const waAiHighlightOuterStyle = {
  background: "linear-gradient(to right, #FF7575, #13DB99, #5CA9F0)",
  boxShadow: "0 4px 8px 0 rgba(88, 206, 167, 0.25)",
} as const
export const waAiHighlightInnerClass = "min-w-0 space-y-3 rounded-lg bg-white p-4"

export const waChoiceTileClass =
  "flex h-full min-h-[4.5rem] min-w-0 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-neutral-100 bg-white px-2 py-2 text-center transition-colors hover:bg-neutral-10/60"

export const waChoiceRowClass =
  "flex min-h-10 min-w-0 cursor-pointer items-center gap-2 rounded-md border border-neutral-100 bg-white px-3 py-2.5 transition-colors hover:bg-neutral-10/60"

/** Bounded scroll list inside SearchPopover (overrides default flex-1 growth in dialogs). */
export const waSearchPopoverScrollListClass =
  "!flex-none flex min-h-0 min-w-0 h-[min(280px,calc(var(--radix-popper-available-height)-120px))] max-h-[min(280px,calc(var(--radix-popper-available-height)-120px))] shrink-0 overflow-y-auto overflow-x-hidden overscroll-contain [-webkit-overflow-scrolling:touch] [&>*]:shrink-0"
