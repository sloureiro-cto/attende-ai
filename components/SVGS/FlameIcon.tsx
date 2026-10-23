export interface IconProps {
  size?: number
  color?: string
  className?: string
}

const FlameIcon = ({ size = 16, color = "currentColor", className }: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      color={color}
    >
      <path
        d="M9.33341 13.791C11.0743 13.2286 12.3334 11.5947 12.3334 9.66663C12.3334 6.66663 8.66675 1.66663 7.33341 1.66663C7.33341 4.66663 3.66675 6.66663 3.66675 9.66663C3.66675 11.5947 4.92591 13.2286 6.66675 13.791"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.33325 13.6553C10.1303 13.2098 10.6666 12.3771 10.6666 11.4234C10.6666 9.6396 8.41018 6.66663 7.58966 6.66663C7.58966 8.45041 5.33325 9.6396 5.33325 11.4234C5.33325 12.3771 5.86952 13.2098 6.66659 13.6553"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default FlameIcon
