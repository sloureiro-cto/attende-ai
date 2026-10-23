"use client"

import { Plus, Trash2, Variable } from "lucide-react"
import { MenuContent, MenuItem } from "components/automations/ui/Menu"
import BtnViewMode from "components/BtnViewMode/BtnViewMode"
import Button from "components/Button/Button"
import IconButton from "components/IconButton/IconButton"
import { TextArea } from "components/TextArea/TextArea"
import TextInput from "components/TextInput/TextInput"
import { Dropdown, DropdownTrigger } from "components/ui/dropdown-menu"
import { newBotId, SALES_BOT_LIMITS } from "lib/automations/botGraph"
import type { AutomationsTranslationKey } from "lib/i18n/translations/automations"
import type { Narrow } from "./types"
import { CardFieldPicker, DurationField, FieldBlock, SwitchRow } from "../BotInspectorControls"

const VARIABLES = ["{{lead.name}}", "{{lead.phone}}", "{{lead.email}}", "{{card.title}}"] as const

export function SendMessageFields({ node, channels, ctx, lookups, patch, t }: Narrow<"send_message">) {
  const options = node.options ?? []
  const listLike = node.replyMode === "buttons" || node.replyMode === "list"
  const max = node.replyMode === "buttons" ? SALES_BOT_LIMITS.buttons : SALES_BOT_LIMITS.listRows
  const labelMax = node.replyMode === "buttons" ? SALES_BOT_LIMITS.buttonLabelChars : SALES_BOT_LIMITS.listLabelChars
  const modes: Array<{ id: typeof node.replyMode; key: AutomationsTranslationKey }> = [
    { id: "none", key: "salesBotReplyNone" },
    { id: "buttons", key: "salesBotReplyButtons" },
    { id: "list", key: "salesBotReplyList" },
    { id: "free", key: "salesBotReplyFree" },
  ]

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <TextArea
          id={`bot-msg-${node.id}`}
          label={t("salesBotFieldMessage")}
          size="small"
          minRows={3}
          maxRows={10}
          autoResize
          maxLength={SALES_BOT_LIMITS.textChars}
          value={node.text}
          onChange={(e) => patch({ text: e.target.value })}
          removeOptionalText
          hideErrorMessage
        />
        <div className="flex items-center justify-between">
          <Dropdown>
            <DropdownTrigger asChild>
              <Button type="button" size="small" variant="ghost" startIcon={<Variable aria-hidden />}>
                {t("salesBotInsertVariable")}
              </Button>
            </DropdownTrigger>
            <MenuContent align="start">
              {VARIABLES.map((v) => (
                <MenuItem key={v} onSelect={() => patch({ text: `${node.text}${v}` })}>
                  {v}
                </MenuItem>
              ))}
            </MenuContent>
          </Dropdown>
          <span className="text-body-11 text-neutral-500">
            {node.text.length}/{SALES_BOT_LIMITS.textChars}
          </span>
        </div>
      </div>

      <FieldBlock label={t("salesBotFieldReplyMode")}>
        <div
          role="group"
          aria-label={t("salesBotFieldReplyMode")}
          className="flex flex-wrap gap-1 rounded-md border border-neutral-50 bg-neutral-10 p-1"
        >
          {modes.map((m) => (
            <BtnViewMode
              key={m.id}
              type="button"
              size="small"
              isActive={node.replyMode === m.id}
              label={t(m.key)}
              onClick={() => {
                if (m.id === node.replyMode) return
                // Options only exist for the choice modes; the reply timeout needs a reply to wait for.
                patch({
                  replyMode: m.id,
                  options:
                    m.id === "buttons" || m.id === "list"
                      ? options.length
                        ? options.slice(0, m.id === "buttons" ? SALES_BOT_LIMITS.buttons : SALES_BOT_LIMITS.listRows)
                        : [{ id: newBotId("o"), label: "" }]
                      : undefined,
                  ...(m.id === "none" ? { noReplyMinutes: undefined, noReplyBusinessHoursOnly: undefined } : {}),
                })
              }}
            />
          ))}
        </div>
      </FieldBlock>

      {listLike ? (
        <FieldBlock label={t("salesBotFieldOptions", { count: options.length, max })} hint={t("salesBotOptionsHint")}>
          <div className="flex flex-col gap-2">
            {options.map((o, i) => (
              <div key={o.id} className="flex items-center gap-2">
                <TextInput
                  size="small"
                  aria-label={t("salesBotOptionLabel", { n: i + 1 })}
                  value={o.label}
                  maxLength={labelMax}
                  error={o.label.trim() ? null : t("salesBotOptionEmpty")}
                  hideErrorMessage
                  containerClassName="min-w-0 flex-1"
                  onChange={(e) =>
                    patch({ options: options.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)) })
                  }
                />
                <IconButton
                  type="button"
                  size="large"
                  variant="ghost"
                  aria-label={t("salesBotRemoveOption")}
                  onClick={() => patch({ options: options.filter((x) => x.id !== o.id) })}
                  className="hover:text-error-darkest"
                  icon={<Trash2 />}
                />
              </div>
            ))}
            <Button
              size="small"
              variant="secondary"
              style="outline"
              startIcon={<Plus className="size-3.5" />}
              disabled={options.length >= max}
              onClick={() => patch({ options: [...options, { id: newBotId("o"), label: "" }] })}
            >
              {t("salesBotAddOption")}
            </Button>
          </div>
        </FieldBlock>
      ) : null}

      {node.replyMode === "free" || listLike ? (
        <FieldBlock label={t("salesBotFieldSaveAnswer")} hint={t("salesBotSaveAnswerHint")}>
          <CardFieldPicker
            value={node.saveAnswerTo ?? ""}
            onChange={(saveAnswerTo) => patch({ saveAnswerTo: saveAnswerTo || undefined })}
            projects={ctx.crmProjects}
            lookups={lookups}
            t={t}
            placeholder={t("salesBotPickField")}
          />
        </FieldBlock>
      ) : null}

      {node.replyMode !== "none" ? (
        <div className="flex flex-col gap-3 rounded-md border border-neutral-50 p-3">
          <SwitchRow
            checked={!!node.noReplyMinutes}
            onChange={(on) =>
              patch({
                noReplyMinutes: on ? 45 : undefined,
                noReplyBusinessHoursOnly: on ? node.noReplyBusinessHoursOnly : undefined,
              })
            }
            label={t("salesBotNoReplyTitle")}
            hint={t("salesBotNoReplyHint")}
          />
          {node.noReplyMinutes ? (
            <>
              <DurationField
                minutes={node.noReplyMinutes}
                max={SALES_BOT_LIMITS.noReplyMinutesMax}
                t={t}
                onChange={(noReplyMinutes) => patch({ noReplyMinutes })}
              />
              <SwitchRow
                checked={!!node.noReplyBusinessHoursOnly}
                onChange={(v) => patch({ noReplyBusinessHoursOnly: v })}
                label={t("salesBotBusinessHoursOnly")}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {node.replyMode === "list" && options.length > 3 && channels.includes("instagram") ? (
        <p className="rounded-md bg-info-clean px-3 py-2 text-body-12 text-info-dark">
          {t("salesBotInstagramListNote")}
        </p>
      ) : null}
    </>
  )
}

// --- send_meta_template ---------------------------------------------------------------------
