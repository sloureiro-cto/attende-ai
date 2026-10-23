import { cn } from "@/lib/utils"

type Props = { className?: string }

/**
 * Decorative bot flow for the login brand panel: nodes joined by flowing connectors. Pure SVG + CSS
 * (see styles/bots-theme.css); motion stops under prefers-reduced-motion. Hidden from assistive tech.
 */
export function BotFlowIllustration({ className }: Props) {
  return (
    <svg
      viewBox="0 0 520 420"
      fill="none"
      aria-hidden
      focusable="false"
      className={cn("h-auto w-full max-w-[520px]", className)}
    >
      <defs>
        <linearGradient id="bf-line" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#45AD7E" stopOpacity="0.2" />
          <stop offset="0.5" stopColor="#8FCEB2" />
          <stop offset="1" stopColor="#7DD3FC" stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id="bf-card" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fff" stopOpacity="0.14" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* connectors */}
      <g stroke="url(#bf-line)" strokeWidth="2" strokeLinecap="round">
        <path className="bots-flow-line" d="M150 96 C 210 96, 210 96, 250 140" />
        <path className="bots-flow-line" d="M150 96 C 200 96, 190 250, 250 250" />
        <path className="bots-flow-line" d="M370 150 C 410 160, 410 230, 440 262" />
        <path className="bots-flow-line" d="M370 250 C 405 250, 415 262, 440 270" />
      </g>

      {/* trigger pill */}
      <g className="bots-float-slow">
        <rect x="36" y="76" width="116" height="40" rx="20" fill="#45AD7E" />
        <circle cx="58" cy="96" r="5" fill="#fff" />
        <rect x="72" y="91" width="62" height="10" rx="5" fill="#fff" fillOpacity="0.9" />
      </g>

      {/* message node with options */}
      <g className="bots-float">
        <rect x="250" y="112" width="130" height="92" rx="14" fill="url(#bf-card)" stroke="#fff" strokeOpacity="0.2" />
        <circle cx="270" cy="134" r="8" fill="#45AD7E" />
        <rect x="286" y="129" width="70" height="10" rx="5" fill="#fff" fillOpacity="0.85" />
        <rect x="266" y="152" width="98" height="18" rx="9" fill="#45AD7E" fillOpacity="0.22" stroke="#45AD7E" strokeOpacity="0.6" />
        <rect x="266" y="176" width="74" height="18" rx="9" fill="#fff" fillOpacity="0.06" stroke="#fff" strokeOpacity="0.22" />
        <circle cx="380" cy="161" r="4" fill="#8FCEB2" />
        <circle className="bots-ring" cx="380" cy="161" r="6" stroke="#8FCEB2" strokeWidth="1.5" />
      </g>

      {/* wait / condition node */}
      <g className="bots-float-slow">
        <rect x="250" y="226" width="120" height="48" rx="14" fill="url(#bf-card)" stroke="#fff" strokeOpacity="0.2" />
        <circle cx="272" cy="250" r="9" stroke="#7DD3FC" strokeWidth="2" />
        <path d="M272 244v6l4 3" stroke="#7DD3FC" strokeWidth="2" strokeLinecap="round" />
        <rect x="292" y="245" width="58" height="10" rx="5" fill="#fff" fillOpacity="0.75" />
      </g>

      {/* outcomes */}
      <g className="bots-float">
        <rect x="440" y="238" width="48" height="48" rx="14" fill="#45AD7E" fillOpacity="0.2" stroke="#45AD7E" strokeOpacity="0.7" />
        <path d="m454 262 8 8 14-16" stroke="#8FCEB2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* stats ribbon */}
      <g className="bots-float-slow">
        <rect x="64" y="318" width="250" height="64" rx="16" fill="url(#bf-card)" stroke="#fff" strokeOpacity="0.18" />
        <rect x="84" y="338" width="44" height="8" rx="4" fill="#fff" fillOpacity="0.5" />
        <rect x="84" y="354" width="70" height="14" rx="5" fill="#fff" fillOpacity="0.85" />
        <path d="M196 362 l22 -14 l20 8 l22 -18 l22 6" stroke="#8FCEB2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="280" cy="344" r="3.6" fill="#8FCEB2" />
      </g>
    </svg>
  )
}
