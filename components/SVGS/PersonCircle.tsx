export interface IconProps {
  size?: number
  color?: string
  className?: string
}

const PersonCircleIcon = ({ size = 16, className }: IconProps) => {
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
        d="M8.08002 8.52C8.03335 8.51334 7.97335 8.51334 7.92002 8.52C6.74669 8.48 5.81335 7.52 5.81335 6.34C5.81335 5.13334 6.78669 4.15334 8.00002 4.15334C9.20669 4.15334 10.1867 5.13334 10.1867 6.34C10.18 7.52 9.25335 8.48 8.08002 8.52Z"
        stroke="#282733"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.4934 12.92C11.3067 14.0067 9.73338 14.6667 8.00005 14.6667C6.26671 14.6667 4.69338 14.0067 3.50671 12.92C3.57338 12.2933 3.97338 11.68 4.68671 11.2C6.51338 9.98666 9.50005 9.98666 11.3134 11.2C12.0267 11.68 12.4267 12.2933 12.4934 12.92Z"
        stroke="#282733"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.00004 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 7.99999C14.6667 4.3181 11.6819 1.33333 8.00004 1.33333C4.31814 1.33333 1.33337 4.3181 1.33337 7.99999C1.33337 11.6819 4.31814 14.6667 8.00004 14.6667Z"
        stroke="#282733"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default PersonCircleIcon
