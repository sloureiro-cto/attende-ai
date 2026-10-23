export interface IconProps {
  size?: number
  color?: string
  className?: string
}

const Pattern5 = ({ size = 24, color = "currentColor", className }: IconProps) => {
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
        d="M18.32 17.5H5.68C4.48 17.5 4 17.8012 4 18.5494V20.4506C4 21.1988 4.48 21.5 5.68 21.5H18.32C19.52 21.5 20 21.1988 20 20.4506V18.5494C20 17.8012 19.52 17.5 18.32 17.5Z"
        fill={color}
      />
      <path
        d="M18.32 10H5.68C4.48 10 4 10.3012 4 11.0494V12.9506C4 13.6988 4.48 14 5.68 14H18.32C19.52 14 20 13.6988 20 12.9506V11.0494C20 10.3012 19.52 10 18.32 10Z"
        fill={color}
      />
      <path
        d="M18.32 2.5H5.68C4.48 2.5 4 2.80118 4 3.54941V5.45059C4 6.19882 4.48 6.5 5.68 6.5H18.32C19.52 6.5 20 6.19882 20 5.45059V3.54941C20 2.80118 19.52 2.5 18.32 2.5Z"
        fill={color}
      />
    </svg>
  )
}

export default Pattern5
