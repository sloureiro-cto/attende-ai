import { Avatar } from "@mui/material"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { IUser } from "app/_types/User"

interface PropTypes extends React.HTMLAttributes<HTMLDivElement> {
  user?: IUser | null
  size?: "extraSmall" | "small" | "medium" | "large" | "extraExtraSmall"
  className?: string
  styles?: React.CSSProperties
}

export default function UserAvatar({ user, size = "medium", className, style, styles, ...props }: PropTypes) {
  const AvatarSize = {
    extraExtraSmall: {
      size: 18,
      textSize: 8,
    },
    extraSmall: {
      size: 20,
      textSize: 10,
    },
    small: {
      size: 24,
      textSize: 12,
    },
    medium: {
      size: 28,
      textSize: 14,
    },
    large: {
      size: 32,
      textSize: 16,
    },
  }

  const dim = AvatarSize[size].size

  if (!user) {
    return (
      <Avatar
        {...props}
        className={cn("bg-primary-darkest text-center text-xs font-normal text-white", className)}
        sx={{
          backgroundColor: "#153426",
          width: dim,
          height: dim,
          fontSize: AvatarSize[size].textSize,
          ...style,
          ...styles,
        }}
      >
        ?
      </Avatar>
    )
  }

  const avatarSrc = (user.image?.trim() || user.avatarUrl?.trim()) ?? ""

  if (!avatarSrc) {
    const displayName = user.name?.trim() || user.fullName?.trim() || user.username?.trim() || ""
    const parts = displayName.split(/\s+/).filter(Boolean)
    const initials = `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase()
    return (
      <Avatar
        {...props}
        className={cn("bg-primary-darkest text-center text-xs font-normal text-white", className)}
        sx={{
          backgroundColor: user.avatarBackground || "#153426",
          width: dim,
          height: dim,
          fontSize: AvatarSize[size].textSize,
          ...style,
          ...styles,
        }}
      >
        {initials || "?"}
      </Avatar>
    )
  }

  return (
    <div
      {...props}
      className={cn("relative shrink-0 overflow-hidden rounded-full bg-primary-darkest", className)}
      style={{
        width: dim,
        height: dim,
        ...style,
        ...styles,
      }}
    >
      <Image
        src={avatarSrc}
        alt={`${user.name || user.fullName || "User"} avatar`}
        width={dim}
        height={dim}
        className="size-full object-cover"
        sizes={`${dim}px`}
      />
    </div>
  )
}
