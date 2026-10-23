import React from "react"

export interface ContactsIconProps {
  size?: number | string
  color?: string
  className?: string
}

export function ContactsIcon({ size = 20, color = "currentColor", className }: ContactsIconProps) {
  const resolvedSize = typeof size === "number" ? size : Number.parseInt(size, 10) || 20
  return (
    <svg
      width={resolvedSize}
      height={resolvedSize}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? color}
    >
      <path
        d="M15.1166 18.0166C14.3833 18.2333 13.5166 18.3333 12.5 18.3333H7.49997C6.4833 18.3333 5.61663 18.2333 4.8833 18.0166C5.06663 15.85 7.29163 14.1416 9.99997 14.1416C12.7083 14.1416 14.9333 15.85 15.1166 18.0166Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.4998 1.66675H7.49984C3.33317 1.66675 1.6665 3.33341 1.6665 7.50008V12.5001C1.6665 15.6501 2.6165 17.3751 4.88317 18.0167C5.0665 15.8501 7.2915 14.1417 9.99984 14.1417C12.7082 14.1417 14.9332 15.8501 15.1165 18.0167C17.3832 17.3751 18.3332 15.6501 18.3332 12.5001V7.50008C18.3332 3.33341 16.6665 1.66675 12.4998 1.66675ZM9.99984 11.8084C8.34984 11.8084 7.0165 10.4668 7.0165 8.81676C7.0165 7.16676 8.34984 5.83341 9.99984 5.83341C11.6498 5.83341 12.9832 7.16676 12.9832 8.81676C12.9832 10.4668 11.6498 11.8084 9.99984 11.8084Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.9833 8.8166C12.9833 10.4666 11.6499 11.8082 9.99994 11.8082C8.34994 11.8082 7.0166 10.4666 7.0166 8.8166C7.0166 7.1666 8.34994 5.83325 9.99994 5.83325C11.6499 5.83325 12.9833 7.1666 12.9833 8.8166Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default ContactsIcon
