import { Chart2 } from "iconsax-react"
import React from "react"

export interface IconProps {
  size?: string
  color?: string
}

const DashboardIcon = ({ size = "72", color = "currentColor" }: IconProps) => {
  return <Chart2 size={size} className={color} />
}

export default DashboardIcon
