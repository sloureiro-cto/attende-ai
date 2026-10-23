export function StopIcon({ size = 14, color = "#F87171" }: { size?: number; color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path
        d="M8.6915 1.16663H5.30817C4.91151 1.16663 4.3515 1.39996 4.0715 1.67996L1.67984 4.07163C1.39984 4.35163 1.1665 4.91163 1.1665 5.3083V8.69162C1.1665 9.08829 1.39984 9.64829 1.67984 9.92829L4.0715 12.32C4.3515 12.6 4.91151 12.8333 5.30817 12.8333H8.6915C9.08817 12.8333 9.64817 12.6 9.92817 12.32L12.3198 9.92829C12.5998 9.64829 12.8332 9.08829 12.8332 8.69162V5.3083C12.8332 4.91163 12.5998 4.35163 12.3198 4.07163L9.92817 1.67996C9.64817 1.39996 9.08817 1.16663 8.6915 1.16663Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2.88184 11.13L11.1302 2.88171" stroke={color} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
