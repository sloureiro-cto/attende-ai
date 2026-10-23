"use client"

import { Gallery, Trash } from "iconsax-react"
import { Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { type DragEvent, useId, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { updateUserAction } from "actions/users/updateUser"
import {
  PROFILE_PHOTO_TYPES,
  setProfilePhotoOverride,
  uploadProfilePhoto,
  useProfilePhotoUrl,
  validateProfilePhoto,
} from "lib/attende/profilePhoto"
import type { BotsAppTranslationKey } from "lib/i18n/translations/botsApp"
import { ProfilePhotoCropDialog } from "./ProfilePhotoCropDialog"
import { UserAvatar } from "./UserAvatar"
import { initialsOf } from "../AccountMenu"
import { actionClass } from "../ui/actionStyles"
import { useBotsAppT } from "../useBotsAppT"

type Status =
  | { kind: "idle" }
  | { kind: "uploading"; percent: number }
  | { kind: "removing" }
  | { kind: "done"; message: BotsAppTranslationKey }
  | { kind: "error"; message: BotsAppTranslationKey }

const ERROR_KEY = { type: "mePhotoErrorType", size: "mePhotoErrorSize" } as const

/**
 * Add, change or remove the signed-in user's photo. It is the JSYNQ user photo: uploaded through the
 * JSYNQ upload route and saved with `updateUserAction` (PATCH /users/me), then pushed into the session.
 */
export function ProfilePhotoField() {
  const { t } = useBotsAppT()
  const { data, update } = useSession()
  const user = data?.user
  const userKey = user?.id || user?.email || ""
  const photo = useProfilePhotoUrl(userKey, user?.image)
  const inputRef = useRef<HTMLInputElement>(null)
  const hintId = useId()
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>({ kind: "idle" })
  const [dragging, setDragging] = useState(false)
  const busy = status.kind === "uploading" || status.kind === "removing"

  const pick = (file: File | undefined) => {
    if (!file || busy) return
    const problem = validateProfilePhoto(file)
    if (problem) {
      setStatus({ kind: "error", message: ERROR_KEY[problem] })
      return
    }
    setStatus({ kind: "idle" })
    const reader = new FileReader()
    reader.onload = () => setCropSrc(typeof reader.result === "string" ? reader.result : null)
    reader.onerror = () => setStatus({ kind: "error", message: "mePhotoErrorRead" })
    reader.readAsDataURL(file)
  }

  const save = async (blob: Blob) => {
    setCropSrc(null)
    setStatus({ kind: "uploading", percent: 0 })
    try {
      const url = await uploadProfilePhoto(blob, (percent) => setStatus({ kind: "uploading", percent }))
      const result = await updateUserAction({ image: url })
      if (!result.success) throw new Error(result.error)
      setProfilePhotoOverride(userKey, url)
      await update({ image: url })
      setStatus({ kind: "done", message: "mePhotoSaved" })
    } catch {
      setStatus({ kind: "error", message: "mePhotoErrorUpload" })
    }
  }

  const remove = async () => {
    setStatus({ kind: "removing" })
    try {
      const result = await updateUserAction({ image: "" })
      if (!result.success) throw new Error(result.error)
      // The session keeps a truthy image until the next sign-in (see lib/attende/profilePhoto), so the override hides it.
      setProfilePhotoOverride(userKey, null)
      setStatus({ kind: "done", message: "mePhotoRemoved" })
    } catch {
      setStatus({ kind: "error", message: "mePhotoErrorRemove" })
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    pick(event.dataTransfer.files?.[0])
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        if (!busy) setDragging(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={onDrop}
      data-testid="profile-photo-dropzone"
      className={cn(
        "flex flex-col items-center gap-5 rounded-2xl border border-dashed p-5 text-center transition-colors sm:flex-row sm:text-left",
        dragging ? "border-primary-dark bg-primary-clean" : "border-neutral-100"
      )}
    >
      <div className="relative">
        <UserAvatar
          src={photo}
          initials={initialsOf(user?.name, user?.email)}
          alt={t("mePhotoAlt", { name: user?.name || user?.email || "" })}
          className="size-24 text-[28px]"
        />
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-neutral-900/60" aria-hidden>
            <Loader2 className="size-7 animate-spin text-white motion-reduce:animate-none" />
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-body-16 font-semibold text-neutral-900">{t("mePhotoTitle")}</h2>
          <p id={hintId} className="text-body-13 text-neutral-500">
            {dragging ? t("mePhotoDrop") : t("mePhotoHint")}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            aria-describedby={hintId}
            className={actionClass({ variant: "secondary", size: "md" })}
          >
            <Gallery size={16} aria-hidden />
            {photo ? t("mePhotoChange") : t("mePhotoAdd")}
          </button>
          {photo && (
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy}
              className={actionClass({ variant: "ghost", size: "md", className: "text-error-dark hover:text-error-darkest" })}
            >
              <Trash size={16} aria-hidden />
              {t("mePhotoRemove")}
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={PROFILE_PHOTO_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          data-testid="profile-photo-input"
          onChange={(event) => {
            pick(event.target.files?.[0])
            event.target.value = ""
          }}
        />
        <div aria-live="polite" className="min-h-5 text-body-13">
          {status.kind === "uploading" && (
            <span className="flex items-center gap-2 text-neutral-600">
              <span
                role="progressbar"
                aria-label={t("mePhotoUploading")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={status.percent}
                className="h-1.5 w-32 overflow-hidden rounded-full bg-neutral-50"
              >
                <span className="block h-full bg-primary-dark transition-[width]" style={{ width: `${status.percent}%` }} />
              </span>
              {t("mePhotoUploadingPercent", { percent: status.percent })}
            </span>
          )}
          {status.kind === "removing" && <span className="text-neutral-600">{t("mePhotoRemoving")}</span>}
          {status.kind === "done" && <span className="font-medium text-success-darkest">{t(status.message)}</span>}
        </div>
        {status.kind === "error" && (
          <p role="alert" className="-mt-2 text-body-13 font-medium text-error-dark">
            {t(status.message)}
          </p>
        )}
      </div>

      <ProfilePhotoCropDialog
        src={cropSrc}
        onCancel={() => setCropSrc(null)}
        onSave={(blob) => void save(blob)}
        onError={() => {
          setCropSrc(null)
          setStatus({ kind: "error", message: "mePhotoErrorRead" })
        }}
      />
    </div>
  )
}
