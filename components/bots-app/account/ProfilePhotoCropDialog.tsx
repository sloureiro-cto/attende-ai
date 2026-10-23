"use client"

import { useCallback, useEffect, useState } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "components/ui/dialog"
import { type CropArea, cropToSquareJpeg } from "lib/attende/profilePhoto"
import { actionClass } from "../ui/actionStyles"
import { useBotsAppT } from "../useBotsAppT"

type Props = {
  /** Data URL of the picked image; null closes the dialog. */
  src: string | null
  onCancel: () => void
  /** Receives the square JPEG. */
  onSave: (blob: Blob) => void
  onError: () => void
}

/** Square crop with zoom (same react-easy-crop flow as the JSYNQ profile page), translated and themed. */
export function ProfilePhotoCropDialog({ src, onCancel, onSave, onError }: Props) {
  const { t } = useBotsAppT()
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<CropArea | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setArea(null)
    setBusy(false)
  }, [src])

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), [])

  const save = async () => {
    if (!src || !area) return
    setBusy(true)
    try {
      onSave(await cropToSquareJpeg(src, area))
    } catch {
      onError()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={Boolean(src)} onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent
        hideCloseButton
        overlayClassName="bg-black/50 backdrop-blur-[2px]"
        className="w-[calc(100vw-2rem)] max-w-[480px] gap-5 rounded-2xl border border-neutral-50 bg-white p-5 text-neutral-900 shadow-xl sm:p-6"
      >
        <div className="flex flex-col gap-1">
          <DialogTitle className="text-body-18 font-semibold text-neutral-900">{t("mePhotoCropTitle")}</DialogTitle>
          <DialogDescription className="text-body-13 text-neutral-500">{t("mePhotoCropHint")}</DialogDescription>
        </div>
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-10">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>
        <label className="flex items-center gap-3 text-body-13 font-medium text-neutral-700">
          {t("mePhotoZoom")}
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-2 flex-1 cursor-pointer accent-primary-dark"
          />
        </label>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className={actionClass({ variant: "secondary" })}>
            {t("mePhotoCancel")}
          </button>
          <button type="button" onClick={() => void save()} disabled={busy || !area} className={actionClass()}>
            {t("mePhotoSave")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
