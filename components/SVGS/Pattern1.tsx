export interface IconProps {
  size?: number
  color?: string
  className?: string
}

const Pattern1 = ({ size = 16, color = "currentColor", className }: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M6.25 10H7.75C9.25 10 10 9.25 10 7.75V6.25C10 4.75 9.25 4 7.75 4H6.25C4.75 4 4 4.75 4 6.25V7.75C4 9.25 4.75 10 6.25 10Z"
        fill={color}
      />
      <path
        d="M16.25 10H17.75C19.25 10 20 9.25 20 7.75V6.25C20 4.75 19.25 4 17.75 4H16.25C14.75 4 14 4.75 14 6.25V7.75C14 9.25 14.75 10 16.25 10Z"
        fill={color}
      />
      <path
        d="M16.25 20H17.75C19.25 20 20 19.25 20 17.75V16.25C20 14.75 19.25 14 17.75 14H16.25C14.75 14 14 14.75 14 16.25V17.75C14 19.25 14.75 20 16.25 20Z"
        fill={color}
      />
      <path
        d="M6.25 20H7.75C9.25 20 10 19.25 10 17.75V16.25C10 14.75 9.25 14 7.75 14H6.25C4.75 14 4 14.75 4 16.25V17.75C4 19.25 4.75 20 6.25 20Z"
        fill={color}
      />
    </svg>
  )
}

export default Pattern1
