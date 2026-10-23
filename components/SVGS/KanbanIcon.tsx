import { Kanban } from "iconsax-react"
import React from "react"

export interface IconProps {
  size?: string
  isGradient?: boolean
  color?: string
}

const KanbanIcon = ({ size = "72", isGradient = false, color = "currentColor" }: IconProps) => {
  return isGradient ? (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox={`0 0 48 48`} fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.00969 3.88248C5.14617 2.81331 6.73937 2.5 8.46 2.5H16.54C18.2606 2.5 19.8538 2.81331 20.9903 3.88248C22.1498 4.97329 22.5 6.53028 22.5 8.2V39.8C22.5 41.4697 22.1498 43.0267 20.9903 44.1175C19.8538 45.1867 18.2606 45.5 16.54 45.5H8.46C6.73937 45.5 5.14617 45.1867 4.00969 44.1175C2.8502 43.0267 2.5 41.4697 2.5 39.8V8.2C2.5 6.53028 2.8502 4.97329 4.00969 3.88248ZM6.06531 6.06752C5.7898 6.32671 5.5 6.86972 5.5 8.2V39.8C5.5 41.1303 5.7898 41.6733 6.06531 41.9325C6.36383 42.2133 7.00063 42.5 8.46 42.5H16.54C17.9994 42.5 18.6362 42.2133 18.9347 41.9325C19.2102 41.6733 19.5 41.1303 19.5 39.8V8.2C19.5 6.86972 19.2102 6.32671 18.9347 6.06752C18.6362 5.78669 17.9994 5.5 16.54 5.5H8.46C7.00063 5.5 6.36383 5.78669 6.06531 6.06752Z"
        fill="url(#paint0_linear_435_1447)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M27.0097 3.88248C28.1462 2.81331 29.7394 2.5 31.46 2.5H39.54C41.2606 2.5 42.8538 2.81331 43.9903 3.88248C45.1498 4.97329 45.5 6.53028 45.5 8.2V25.8C45.5 27.4697 45.1498 29.0267 43.9903 30.1175C42.8538 31.1867 41.2606 31.5 39.54 31.5H31.46C29.7394 31.5 28.1462 31.1867 27.0097 30.1175C25.8502 29.0267 25.5 27.4697 25.5 25.8V8.2C25.5 6.53028 25.8502 4.97329 27.0097 3.88248ZM29.0653 6.06752C28.7898 6.32671 28.5 6.86972 28.5 8.2V25.8C28.5 27.1303 28.7898 27.6733 29.0653 27.9325C29.3638 28.2133 30.0006 28.5 31.46 28.5H39.54C40.9994 28.5 41.6362 28.2133 41.9347 27.9325C42.2102 27.6733 42.5 27.1303 42.5 25.8V8.2C42.5 6.86972 42.2102 6.32671 41.9347 6.06752C41.6362 5.78669 40.9994 5.5 39.54 5.5H31.46C30.0006 5.5 29.3638 5.78669 29.0653 6.06752Z"
        fill="url(#paint1_linear_435_1447)"
      />
      <defs>
        <linearGradient id="paint0_linear_435_1447" x1="45.5" y1="24" x2="2.5" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1C2223" />
          <stop offset="1" stopColor="#45AD7E" />
        </linearGradient>
        <linearGradient id="paint1_linear_435_1447" x1="45.5" y1="24" x2="2.5" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1C2223" />
          <stop offset="1" stopColor="#45AD7E" />
        </linearGradient>
      </defs>
    </svg>
  ) : (
    <Kanban size={size} className={!isGradient ? color : ""} color={isGradient ? "url(#gradient)" : "currentColor"} />
  )
}

export default KanbanIcon
