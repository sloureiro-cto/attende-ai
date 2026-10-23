"use client"

import { Send2 } from "iconsax-react"
import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react"
import type { AttendeInboxT } from "./useAttendeInboxT"

type Props = {
  t: AttendeInboxT
  /** Resolving to `false` means the message did not go out (e.g. taking over failed): the text is put back. */
  onSend: (text: string) => void | boolean | Promise<boolean | void>
  /** Called (throttled by the caller) while the user is typing, for the presence indicator. */
  onTyping?: () => void
  disabled?: boolean
  /** Why sending is not available (e.g. group conversation). Replaces the input. */
  disabledReason?: string
  /** The AI is answering: the placeholder says that sending takes over. */
  aiActive?: boolean
}

const MAX_ROWS = 6
const LINE_PX = 22

/** Message field (16px on phones so iOS does not zoom in on focus): Enter sends, Shift+Enter breaks the line, grows up to 6 lines, ignores Enter while composing (IME). */
export function Composer({ t, onSend, onTyping, disabled = false, disabledReason, aiActive = false }: Props) {
  const [value, setValue] = useState("")
  const field = useRef<HTMLTextAreaElement | null>(null)

  const resize = useCallback(() => {
    const el = field.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS * LINE_PX + 16)}px`
  }, [])

  useEffect(resize, [value, resize])

  const submit = useCallback(() => {
    const text = value.trim()
    if (!text || disabled) return
    const result = onSend(text)
    setValue("")
    requestAnimationFrame(() => field.current?.focus())
    void Promise.resolve(result).then((sent) => {
      if (sent === false) setValue((current) => (current === "" ? text : current))
    })
  }, [disabled, onSend, value])

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit()
  }

  if (disabledReason) {
    return <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 text-center text-body-13 text-neutral-500">{disabledReason}</div>
  }

  return (
    <form onSubmit={onSubmit} className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-5 sm:pb-4">
      <div className="flex items-end gap-2 rounded-2xl border border-neutral-50 bg-white py-1.5 pl-3.5 pr-1.5 focus-within:border-neutral-200">
        <textarea
          ref={field}
          value={value}
          rows={1}
          name="message"
          enterKeyHint="send"
          aria-label={t("composerAria")}
          placeholder={aiActive ? t("composerTakeOverPlaceholder") : t("composerPlaceholder")}
          title={t("composerHint")}
          disabled={disabled}
          onChange={(e) => {
            setValue(e.target.value)
            onTyping?.()
          }}
          onKeyDown={onKeyDown}
          className="max-h-40 min-h-9 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[16px] text-neutral-900 outline-none placeholder:text-neutral-500 sm:text-body-14"
        />
        <button
          type="submit"
          disabled={disabled || value.trim() === ""}
          aria-label={t("send")}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-dark text-white transition-opacity disabled:opacity-40"
        >
          <Send2 size={17} variant="Bold" aria-hidden />
        </button>
      </div>
    </form>
  )
}
