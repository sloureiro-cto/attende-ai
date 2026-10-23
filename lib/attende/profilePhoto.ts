"use client"

import { useSyncExternalStore } from "react"

/** Formats the photo picker accepts. The JSYNQ upload route takes any file up to 10 MB; we keep it tighter. */
export const PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024
/** Side of the square JPEG we upload after cropping. */
export const PROFILE_PHOTO_SIZE = 512

export type ProfilePhotoError = "type" | "size"

export function validateProfilePhoto(file: File): ProfilePhotoError | null {
  if (!(PROFILE_PHOTO_TYPES as readonly string[]).includes(file.type)) return "type"
  if (file.size > PROFILE_PHOTO_MAX_BYTES) return "size"
  return null
}

/** A session image counts as a photo only when it is a non-blank URL. */
export function photoUrlOf(image?: string | null): string | null {
  const value = image?.trim()
  return value ? value : null
}

/**
 * Uploads through the same route the JSYNQ profile page uses (`app/utils/uploadImageToS3` -> POST /api/upload),
 * with XHR so the caller can show progress. Resolves with the public S3 URL.
 */
export function uploadProfilePhoto(blob: Blob, onProgress?: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append("file", blob, "profile-image.jpg")
    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/upload")
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as { success?: boolean; url?: string }
        if (xhr.status >= 200 && xhr.status < 300 && body.success && body.url) resolve(body.url)
        else reject(new Error("upload failed"))
      } catch {
        reject(new Error("upload failed"))
      }
    }
    xhr.onerror = () => reject(new Error("upload failed"))
    xhr.send(form)
  })
}

export type CropArea = { x: number; y: number; width: number; height: number }

/** Draws the cropped area into a square JPEG (at most PROFILE_PHOTO_SIZE px). */
export async function cropToSquareJpeg(src: string, area: CropArea): Promise<Blob> {
  const image = new Image()
  image.src = src
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error("image load failed"))
  })
  const side = Math.min(PROFILE_PHOTO_SIZE, Math.round(area.width))
  const canvas = document.createElement("canvas")
  canvas.width = side
  canvas.height = side
  const context = canvas.getContext("2d")
  if (!context) throw new Error("canvas unavailable")
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, side, side)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))), "image/jpeg", 0.9)
  })
}

/*
 * The JWT callback only copies a truthy `image` on `update()`, so removing a photo cannot clear the session
 * image until the next sign-in. This small store holds the latest choice made in this tab (per user) and
 * the avatars read it before the session.
 */
type Override = { user: string; url: string | null }
let override: Override | null = null
const listeners = new Set<() => void>()

export function setProfilePhotoOverride(user: string, url: string | null) {
  override = { user, url }
  listeners.forEach((listener) => listener())
}

/** Test helper. */
export function resetProfilePhotoOverride() {
  override = null
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const snapshot = () => override

/** Photo URL to show for the signed-in user: this tab's latest change, else the session image. */
export function useProfilePhotoUrl(user: string | null | undefined, sessionImage: string | null | undefined): string | null {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot)
  if (current && user && current.user === user) return current.url
  return photoUrlOf(sessionImage)
}
