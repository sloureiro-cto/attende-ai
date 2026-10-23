export interface IconProps {
  size?: number
  color?: string
  className?: string
}

const WarmIcon = ({ size = 16, color = "currentColor", className }: IconProps) => {
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
        d="M12.3334 7.99996C12.3334 5.60663 10.3934 3.66663 8.00008 3.66663C5.60675 3.66663 3.66675 5.60663 3.66675 7.99996"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.32658 3.3267L3.23991 3.24003M12.6733 3.3267L12.7599 3.24003L12.6733 3.3267ZM7.99992 1.3867V1.33337V1.3867ZM1.3866 8.00004H1.33325H1.3866ZM14.6666 8.00004H14.6132H14.6666Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2.66675 10H13.3334" stroke={color} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12H12" stroke={color} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 14H10" stroke={color} strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default WarmIcon
