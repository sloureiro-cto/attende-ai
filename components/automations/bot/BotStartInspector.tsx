"use client"

import { Play, X } from "lucide-react"
import { type Dispatch, memo } from "react"
import { useAutomationsT } from "components/automations/ui/useAutomationsT"
import IconButton from "components/IconButton/IconButton"
import TextInput from "components/TextInput/TextInput"
import type { BotBuilderAction, BotDraft } from "lib/automations/botBuilderState"
import { FieldBlock, SwitchRow } from "./BotInspectorControls"
import { BotSelect } from "./BotSelect"

type Props = { draft: BotDraft; dispatch: Dispatch<BotBuilderAction>; onClose: () => void }

/** Editor of the start pill: how the bot begins and when it must stop. */
export const BotStartInspector = memo(function BotStartInspector({ draft, dispatch, onClose }: Props) {
  const { t } = useAutomationsT()
  const trigger = draft.trigger
  return (
    <aside
      aria-label={t("salesBotInspectorTitle")}
      className="absolute inset-y-4 right-4 z-20 flex w-[340px] flex-col overflow-hidden rounded-lg border border-neutral-border bg-white shadow-xl"
    >
      <div className="flex items-center gap-2 border-b border-neutral-50 p-3">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-dark text-white"
          aria-hidden
        >
          <Play className="size-4 fill-current" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-12 text-neutral-400">{t("salesBotInspectorStartKind")}</p>
          <p className="truncate text-body-14 font-semibold text-neutral-800">{t("salesBotStart")}</p>
        </div>
        <IconButton type="button" size="large" variant="ghost" aria-label={t("salesBotClose")} onClick={onClose} icon={<X />} />
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <FieldBlock label={t("salesBotFieldStartsWhen")}>
          <BotSelect
            size="small"
            value={trigger.kind}
            onValueChange={(kind) =>
              dispatch({ type: "meta", patch: { trigger: { ...trigger, kind: kind as typeof trigger.kind } } })
            }
            items={[
              { value: "new_conversation", displayName: t("salesBotTriggerNewConversation") },
              { value: "manual", displayName: t("salesBotTriggerManual") },
            ]}
          />
        </FieldBlock>
        {trigger.kind === "manual" ? (
          <p className="text-body-12 text-neutral-500">{t("salesBotTriggerManualHint")}</p>
        ) : null}
        <TextInput
          size="small"
          type="number"
          min={0}
          max={365}
          label={t("salesBotFieldDedupe")}
          value={String(trigger.dedupeDays)}
          helperText={t("salesBotDedupeHint")}
          onChange={(e) =>
            dispatch({
              type: "meta",
              patch: {
                trigger: {
                  ...trigger,
                  dedupeDays: Math.max(0, Math.min(365, Math.round(Number(e.target.value) || 0))),
                },
              },
            })
          }
          hideErrorMessage
          removeOptionalText
        />
        <SwitchRow
          checked={draft.stopOnHumanReply}
          onChange={(stopOnHumanReply) => dispatch({ type: "meta", patch: { stopOnHumanReply } })}
          label={t("salesBotStopOnHuman")}
          hint={t("salesBotStopOnHumanHint")}
        />
      </div>
    </aside>
  )
})
