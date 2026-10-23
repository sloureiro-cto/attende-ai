export interface IconProps {
  size?: number
  color?: string
  className?: string
}

const Pattern4 = ({ size = 24, color = "currentColor", className }: IconProps) => {
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
        d="M6.5 18.32L6.5 5.68C6.5 4.48 6.19882 4 5.45059 4L3.54941 4C2.80118 4 2.5 4.48 2.5 5.68L2.5 18.32C2.5 19.52 2.80118 20 3.54941 20L5.45059 20C6.19882 20 6.5 19.52 6.5 18.32Z"
        fill={color}
      />
      <path
        d="M14 18.32L14 5.68C14 4.48 13.6988 4 12.9506 4L11.0494 4C10.3012 4 10 4.48 10 5.68L10 18.32C10 19.52 10.3012 20 11.0494 20L12.9506 20C13.6988 20 14 19.52 14 18.32Z"
        fill={color}
      />
      <path
        d="M21.5 18.32L21.5 5.68C21.5 4.48 21.1988 4 20.4506 4L18.5494 4C17.8012 4 17.5 4.48 17.5 5.68L17.5 18.32C17.5 19.52 17.8012 20 18.5494 20L20.4506 20C21.1988 20 21.5 19.52 21.5 18.32Z"
        fill={color}
      />
    </svg>
  )
}

export default Pattern4
