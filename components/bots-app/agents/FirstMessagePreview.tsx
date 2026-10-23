"use client"

import { Info } from "lucide-react"
import { agentLanguageOf } from "lib/attende/agents/localize"
import { firstMessage } from "lib/attende/agents/samples"
import type { AgentForm } from "lib/attende/agents/types"
import type { AttendeAgentsT } from "./useAttendeAgentsT"

const LANGUAGE_KEY = { pt: "languagePt", en: "languageEn", es: "languageEs" } as const

/**
 * How the agent's first message could look, built from the answers of the identity step: assistant name, business
 * name, the AGENT's language (the screen's language never changes it), tone and the virtual-assistant notice.
 * Labelled as an illustration: the real message is written by the AI.
 */
export function FirstMessagePreview({ form, t }: { form: AgentForm; t: AttendeAgentsT }) {
  const language = agentLanguageOf(form)
  const disclosure = form.disclosure !== false
  const text = firstMessage({
    tone: typeof form.tone === "string" ? form.tone : "friendly",
    language,
    assistant: String(form.assistantName ?? ""),
    business: String(form.businessName ?? ""),
    disclosure,
  })
  return (
    <figure className="flex flex-col gap-3 rounded-2xl border border-neutral-border bg-neutral-10/60 p-4" aria-labelledby="agent-first-message-title">
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span id="agent-first-message-title" className="text-body-14 font-semibold text-neutral-900">
          {t("firstMessageTitle")}
        </span>
        <span className="text-body-12 text-neutral-600">{t("firstMessageLanguage", { language: t(LANGUAGE_KEY[language]) })}</span>
      </figcaption>
      <blockquote lang={language === "pt" ? "pt-BR" : language} className="max-w-[90%] self-start rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-body-14 text-neutral-900 shadow-sm">
        {text}
      </blockquote>
      {disclosure && (
        <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-clean px-2.5 py-1 text-body-12 font-medium text-primary-darkest">
          <Info className="size-3.5" aria-hidden />
          {t("firstMessageDisclosure")}
        </p>
      )}
      <p className="text-body-12 text-neutral-600">{t("firstMessageNote")}</p>
    </figure>
  )
}
