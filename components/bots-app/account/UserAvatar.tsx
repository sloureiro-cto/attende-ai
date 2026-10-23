"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type Props = {
  /** Photo URL; null or a URL that fails to load shows the initials. */
  src: string | null
  initials: string
  /** Size, text size and any ring. */
  className?: string
  /** Leave empty when the name is next to the avatar (decorative). */
  alt?: string
}

/** Round user avatar: the profile photo, or initials on a dark disc when there is none or it fails to load. */
export function UserAvatar({ src, initials, className, alt = "" }: Props) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  const showPhoto = Boolean(src) && !failed

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-900 font-semibold text-white",
        className
      )}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- S3 URL of any size; a plain img keeps the onError fallback simple.
        <img src={src!} alt="" className="size-full object-cover" onError={() => setFailed(true)} data-testid="user-avatar-photo" />
      ) : (
        initials
      )}
    </span>
  )
}
