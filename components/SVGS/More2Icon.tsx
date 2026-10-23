import { SVGProps } from "react"

type More2IconProps = {
  size?: number | string
  className?: string
} & SVGProps<SVGSVGElement>

/**
 * Vuesax linear more-2 (3×3 grid).
 * Dot centers are spaced farther apart than the stock asset for rail readability.
 * Source reference: components/images/vuesax/linear/more-2.svg
 */
export function More2Icon({ size = 24, className, ...props }: More2IconProps) {
  // Centers at 6.5 / 16 / 25.5 — open gaps so the grid reads clearly at large rail sizes.
  const positions = [6.5, 16, 25.5] as const

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
      {...props}
    >
      {positions.flatMap((y) =>
        positions.map((x) => (
          <path
            key={`${x}-${y}`}
            d={`M${x} ${y}h0.0001`}
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))
      )}
    </svg>
  )
}
