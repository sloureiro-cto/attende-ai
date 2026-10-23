const Close = ({ size = 16, className }: { size?: number; className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={className}
    >
      <path d="M4 4L11.9999 11.9999" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.00007 11.9999L12 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default Close
