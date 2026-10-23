import React from "react"

interface KanbanProjectIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
}

const KanbanProjectIcon: React.FC<KanbanProjectIconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M10.5 19.8999V4.09988C10.5 2.59988 9.86 1.99988 8.27 1.99988H4.23C2.64 1.99988 2 2.59988 2 4.09988V19.8999C2 21.3999 2.64 21.9999 4.23 21.9999H8.27C9.86 21.9999 10.5 21.3999 10.5 19.8999Z"
      stroke="#45AD7E"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M22.0002 12.8999V4.09988C22.0002 2.59988 21.3602 1.99988 19.7702 1.99988H15.7302C14.1402 1.99988 13.5002 2.59988 13.5002 4.09988V12.8999C13.5002 14.3999 14.1402 14.9999 15.7302 14.9999H19.7702C21.3602 14.9999 22.0002 14.3999 22.0002 12.8999Z"
      stroke="#45AD7E"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default KanbanProjectIcon
