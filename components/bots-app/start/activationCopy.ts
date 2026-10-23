"use client"

import { useCallback } from "react"
import { type Activation, type ActivationStep, type ActivationStepId, needsAgent, type StepCode, type StepState } from "lib/attende/activation"
import { formatDate } from "lib/attende/format"
import type { OnboardingTranslationKey } from "lib/i18n/translations/attende/onboarding"
import { useAcquisitionT } from "../acquisition/useAcquisitionT"
import { BOTS_ROUTES } from "../brand"

/** Title and description of each step: the home and the guided setup use exactly these. */
export const STEP_COPY: Record<ActivationStepId, { title: OnboardingTranslationKey; text: OnboardingTranslationKey }> = {
  channel: { title: "actChannelTitle", text: "actChannelText" },
  agent: { title: "actAgentTitle", text: "actAgentText" },
  knowledge: { title: "actKnowledgeTitle", text: "actKnowledgeText" },
  test: { title: "actTestTitle", text: "actTestText" },
  activate: { title: "actActivateTitle", text: "actActivateText" },
}

export const STATE_KEY: Record<StepState, OnboardingTranslationKey> = { done: "actStateDone", todo: "actStateTodo", unknown: "actStateUnknown" }

const CODE_KEY: Record<StepCode, OnboardingTranslationKey> = {
  channel_connected: "actCodeChannelConnected",
  channel_none: "actCodeChannelNone",
  channel_offline: "actCodeChannelOffline",
  channel_unknown: "actCodeChannelUnknown",
  agent_created: "actCodeAgentCreated",
  agent_none: "actCodeAgentNone",
  agent_unknown: "actCodeAgentsUnknown",
  knowledge_added: "actCodeKnowledgeAdded",
  knowledge_description: "actCodeKnowledgeDescription",
  knowledge_none: "actCodeKnowledgeNone",
  knowledge_needs_agent: "actCodeAfterAgent",
  knowledge_unknown: "actCodeAgentsUnknown",
  test_passed: "actCodeTestPassed",
  test_not_run: "actCodeTestNotRun",
  test_needs_agent: "actCodeAfterAgent",
  test_needs_channel: "actCodeTestNeedsChannel",
  test_channel_offline: "actCodeChannelOfAgentOffline",
  test_unknown: "actCodeAgentsUnknown",
  activate_active: "actCodeActive",
  activate_paused: "actCodePaused",
  activate_needs_agent: "actCodeAfterAgent",
  activate_needs_channel: "actCodeActivateNeedsChannel",
  activate_channel_offline: "actCodeActivateOffline",
  activate_unknown: "actCodeAgentsUnknown",
}

/** `null`: the step waits on another one (no action of its own, the reason says what it waits for). */
function ctaKey(step: ActivationStep): OnboardingTranslationKey | null {
  if (step.state === "done") return "actCtaView"
  if (needsAgent(step)) return null
  switch (step.code) {
    case "channel_none":
      return "actCtaConnectChannel"
    case "channel_offline":
      return "actCtaReconnectChannel"
    case "agent_none":
      return "actCtaCreateAgent"
    case "agent_unknown":
    case "knowledge_unknown":
    case "test_unknown":
    case "activate_unknown":
      return "actCtaOpenAgents"
    case "knowledge_none":
      return "actCtaAddDocuments"
    case "test_not_run":
      return "actCtaTest"
    case "test_needs_channel":
    case "activate_needs_channel":
      return step.href === BOTS_ROUTES.lines ? "actCtaConnectChannel" : "actCtaChooseChannel"
    case "activate_paused":
      return "actCtaTurnOn"
    default:
      return "actCtaOpenChannels"
  }
}

/** Translated wording of a step (title, description, state, reason, action), from the shared dictionary. */
export function useActivationCopy(activation: Pick<Activation, "focusAgent">) {
  const { t, language } = useAcquisitionT()
  const agentName = activation.focusAgent?.name ?? ""
  const testedAt = activation.focusAgent?.lastTestPassedAt
  const describe = useCallback(
    (step: ActivationStep) => ({
      title: t(STEP_COPY[step.id].title),
      text: t(STEP_COPY[step.id].text),
      state: t(STATE_KEY[step.state]),
      reason: t(CODE_KEY[step.code], { agent: agentName, date: testedAt ? formatDate(testedAt, language) : "" }),
      cta: ((key) => (key ? t(key) : null))(ctaKey(step)),
    }),
    [t, language, agentName, testedAt]
  )
  return { t, language, describe }
}
