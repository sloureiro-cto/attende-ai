export interface IconProps {
  size?: number
  color?: string
  className?: string
}

const Pattern2 = ({ size = 16, color = "currentColor", className }: IconProps) => {
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
        d="M20 10.5909V4.40909C20 3.04545 19.5482 2.5 18.4259 2.5H15.5741C14.4518 2.5 14 3.04545 14 4.40909V10.5909C14 11.9545 14.4518 12.5 15.5741 12.5H18.4259C19.5482 12.5 20 11.9545 20 10.5909Z"
        fill={color}
      />
      <path
        d="M20 19.4V17.6C20 16.1 19.5482 15.5 18.4259 15.5H15.5741C14.4518 15.5 14 16.1 14 17.6V19.4C14 20.9 14.4518 21.5 15.5741 21.5H18.4259C19.5482 21.5 20 20.9 20 19.4Z"
        fill={color}
      />
      <path
        d="M10 13.4091V19.5909C10 20.9545 9.54824 21.5 8.42588 21.5H5.57412C4.45176 21.5 4 20.9545 4 19.5909V13.4091C4 12.0455 4.45176 11.5 5.57412 11.5H8.42588C9.54824 11.5 10 12.0455 10 13.4091Z"
        fill={color}
      />
      <path
        d="M10 4.6V6.4C10 7.9 9.54824 8.5 8.42588 8.5H5.57412C4.45176 8.5 4 7.9 4 6.4V4.6C4 3.1 4.45176 2.5 5.57412 2.5H8.42588C9.54824 2.5 10 3.1 10 4.6Z"
        fill={color}
      />
    </svg>
  )
}

export default Pattern2
