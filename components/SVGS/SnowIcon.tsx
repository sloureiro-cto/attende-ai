export interface IconProps {
  size?: number
  color?: string
  className?: string
}

const SnowIcon = ({ size = 16, color = "currentColor", className }: IconProps) => {
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
        d="M6.29321 2.66669L7.99988 4.37335L9.70655 2.66669"
        stroke={color}
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.70679 13.3333L8.00012 11.6266L6.29345 13.3333"
        stroke={color}
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 14L8 2" stroke={color} strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M13.4719 9.1889L11.1406 9.81359L11.7653 12.1449"
        stroke={color}
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.52808 6.8111L4.85943 6.18641L4.23474 3.85506"
        stroke={color}
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2.80374 5L13.196 11" stroke={color} strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M11.7656 3.85559L11.1409 6.18694L13.4723 6.81162"
        stroke={color}
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.23438 12.1444L4.85906 9.81306L2.52771 9.18838"
        stroke={color}
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2.80374 11L13.196 5" stroke={color} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default SnowIcon
