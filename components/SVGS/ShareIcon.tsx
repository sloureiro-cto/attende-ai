export interface IconProps {
  size?: number
  color?: string
}

const ShareIcon = ({ size = 14, color = "currentColor" }: IconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={color}
    >
      <path
        d="M5.60027 7.07194C5.60027 6.17631 4.87422 5.45027 3.9786 5.45027C3.08298 5.45027 2.35693 6.17632 2.35693 7.07194C2.35693 7.96756 3.08298 8.6936 3.9786 8.6936C4.87422 8.6936 5.60027 7.96756 5.60027 7.07194Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.6447 2.95499C11.6447 2.05937 10.9187 1.33333 10.023 1.33333C9.12741 1.33333 8.40137 2.05937 8.40137 2.95499C8.40137 3.85061 9.12741 4.57666 10.023 4.57666C10.9187 4.57666 11.6447 3.85061 11.6447 2.95499Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.79932 3.89152L5.29932 6.22485" stroke="currentColor" />
      <path
        d="M11.6447 11.0474C11.6447 11.9431 10.9187 12.6691 10.023 12.6691C9.12741 12.6691 8.40137 11.9431 8.40137 11.0474C8.40137 10.1518 9.12741 9.42578 10.023 9.42578C10.9187 9.42578 11.6447 10.1518 11.6447 11.0474Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.79932 10.1109L5.29932 7.77759" stroke="currentColor" />
    </svg>
  )
}

export default ShareIcon
