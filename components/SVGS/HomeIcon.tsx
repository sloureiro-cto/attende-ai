import { Home2 } from "iconsax-react"
import React from "react"

export interface IconProps {
  size?: string
  color?: string
}

const HomeIcon = ({ size = "72", color = "currentColor" }: IconProps) => {
  return <Home2 size={size} className={color} />
}

export default HomeIcon
