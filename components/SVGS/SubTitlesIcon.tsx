interface IconProps {
  size?: number
  color?: string
  className?: string
}

const SubTitlesIcon = ({ size = 24, color = "currentColor", className = "" }: IconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      color={color}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 9.7815C9.92282 9.2773 9.19005 9 8.43778 9C7.65956 9 6.91377 9.31513 6.36253 9.87606C5.8113 10.437 5.5 11.1996 5.5 12C5.5 12.7941 5.8113 13.5567 6.36253 14.1239C6.91377 14.6849 7.65956 15 8.43778 15C9.19654 15 9.92931 14.7227 10.5 14.2185"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 9.7815C17.9228 9.2773 17.1901 9 16.4378 9C15.6596 9 14.9138 9.31513 14.3625 9.87606C13.8113 10.437 13.5 11.1996 13.5 12C13.5 12.7941 13.8113 13.5567 14.3625 14.1239C14.9138 14.6849 15.6596 15 16.4378 15C17.1965 15 17.9293 14.7227 18.5 14.2185"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default SubTitlesIcon
