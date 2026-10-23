export interface IconProps {
  size?: number
  color?: string
  className?: string
}

const DollarIcon = ({ size = 16, className }: IconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <path
        d="M4.00464 10.6667C4.00464 12.1431 5.19205 13.3333 6.66731 13.3333H9.6778C10.9612 13.3333 12.0046 12.2919 12.0046 11.01C12.0046 9.61374 11.369 9.12161 10.4214 8.80115L5.58785 7.19886C4.64032 6.8784 4.00464 6.38627 4.00464 4.98999C4.00464 3.70816 5.04812 2.66667 6.33147 2.66667H9.34197C10.8172 2.66667 12.0046 3.85694 12.0046 5.33334"
        stroke="#282733"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.00464 1.33333V14.6667" stroke="#282733" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default DollarIcon
