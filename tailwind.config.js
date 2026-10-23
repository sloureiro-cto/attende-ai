/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    // `lib/` wasn't scanned at all — any class name that only ever appears as
    // a string literal in a lib/ file (e.g. an arbitrary-value class built
    // once and shared via a constant, like CARD_FIELD_WIDTH_BASIS) silently
    // generated no CSS. The class still renders in the DOM, so this fails
    // quietly: no error, the element just falls back to default sizing.
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    // `context/` had the same gap as `lib/` above: `OverlayStackContext.tsx` builds
    // z-index classes (e.g. `z-[190]`) as shared string constants that are never
    // written literally in any scanned file, so no CSS rule was ever generated for
    // them. The class still lands in the DOM with no visible error — dialogs that
    // ask to render above a fullscreen modal silently got `z-index: auto` on their
    // backdrop instead, letting lower, already-compiled z-index elements (e.g. the
    // main nav sidebar's `z-40`) paint on top of the dimming overlay.
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        login: "url('../components/images/bgLogin.svg')",
        linear: "linear-gradient(135deg, #17242D 0%, #45AD7E 100%)",
        "linear-top": "linear-gradient(180deg, #1C2223 0%, #45AD7E 100%)",
        "linear-bottom": "linear-gradient(0deg, #153426 0%, #45AD7E 100%)",
        "linear-left": "linear-gradient(90deg, #153426 0%, #45AD7E 100%)",
        "linear-right": "linear-gradient(270deg, #153426 0%, #45AD7E 100%)",
      },
      colors: {
        white: "rgb(var(--color-white, 255 255 255) / <alpha-value>)",
        // Every shade (not just DEFAULT) is backed by its own CSS variable — set inline per
        // workspace, all six at once, whenever a provider overrides primary/secondary (see
        // ClientLayout.tsx's deriveColorShades()) — with the original hex (as RGB channels) as
        // the var() fallback, so any workspace that never sets these renders byte-identical to
        // before. RGB channel format (not hex) is required for Tailwind's opacity modifiers
        // (bg-primary/20) to keep working once a token is variable-backed.
        primary: {
          darkest: "rgb(var(--color-primary-darkest, 21 52 38) / <alpha-value>)",
          dark: "rgb(var(--color-primary-dark, 41 104 76) / <alpha-value>)",
          DEFAULT: "rgb(var(--color-primary, 69 173 126) / <alpha-value>)",
          light: "rgb(var(--color-primary-light, 143 206 178) / <alpha-value>)",
          lighter: "rgb(var(--color-primary-lighter, 199 230 216) / <alpha-value>)",
          clean: "rgb(var(--color-primary-clean, 238 247 243) / <alpha-value>)",
        },
        secondary: {
          darkest: "rgb(var(--color-secondary-darkest, 25 27 28) / <alpha-value>)",
          dark: "rgb(var(--color-secondary-dark, 43 45 47) / <alpha-value>)",
          DEFAULT: "rgb(var(--color-secondary, 85 90 94) / <alpha-value>)",
          light: "rgb(var(--color-secondary-light, 136 140 142) / <alpha-value>)",
          lighter: "rgb(var(--color-secondary-lighter, 204 206 207) / <alpha-value>)",
          clean: "rgb(var(--color-secondary-clean, 240 240 241) / <alpha-value>)",
        },
        neutral: {
          900: "rgb(var(--color-neutral-900, 4 4 5) / <alpha-value>)",
          800: "rgb(var(--color-neutral-800, 23 22 30) / <alpha-value>)",
          700: "rgb(var(--color-neutral-700, 40 39 51) / <alpha-value>)",
          600: "rgb(var(--color-neutral-600, 58 56 71) / <alpha-value>)",
          500: "rgb(var(--color-neutral-500, 77 75 92) / <alpha-value>)",
          400: "rgb(var(--color-neutral-400, 96 94 112) / <alpha-value>)",
          300: "rgb(var(--color-neutral-300, 115 113 133) / <alpha-value>)",
          200: "rgb(var(--color-neutral-200, 136 133 153) / <alpha-value>)",
          100: "rgb(var(--color-neutral-100, 187 185 199) / <alpha-value>)",
          50: "rgb(var(--color-neutral-50, 228 228 233) / <alpha-value>)",
          10: "rgb(var(--color-neutral-10, 246 246 250) / <alpha-value>)",
          border: "rgb(var(--color-neutral-border, 223 225 231) / <alpha-value>)",
          transparent: "rgba(238, 247, 243, 0.10);",
        },
        border: {
          request: "rgba(255, 255, 255, 0.20)",
        },
        warning: {
          darkest: "rgb(var(--color-warning-darkest, 161 98 7) / <alpha-value>)",
          dark: "rgb(var(--color-warning-dark, 202 138 4) / <alpha-value>)",
          DEFAULT: "rgb(var(--color-warning, 234 179 8) / <alpha-value>)",
          light: "rgb(var(--color-warning-light, 250 204 21) / <alpha-value>)",
          lighter: "rgb(var(--color-warning-lighter, 252 211 77) / <alpha-value>)",
          clean: "rgb(var(--color-warning-clean, 254 242 202) / <alpha-value>)",
        },
        error: {
          darkest: "rgb(var(--color-error-darkest, 185 28 28) / <alpha-value>)",
          dark: "rgb(var(--color-error-dark, 220 38 38) / <alpha-value>)",
          DEFAULT: "rgb(var(--color-error, 239 68 68) / <alpha-value>)",
          light: "rgb(var(--color-error-light, 248 113 113) / <alpha-value>)",
          lighter: "rgb(var(--color-error-lighter, 252 165 165) / <alpha-value>)",
          clean: "rgb(var(--color-error-clean, 254 228 228) / <alpha-value>)",
        },
        success: {
          darkest: "rgb(var(--color-success-darkest, 4 120 87) / <alpha-value>)",
          dark: "rgb(var(--color-success-dark, 5 150 105) / <alpha-value>)",
          DEFAULT: "rgb(var(--color-success, 16 185 129) / <alpha-value>)",
          light: "rgb(var(--color-success-light, 52 211 153) / <alpha-value>)",
          lighter: "rgb(var(--color-success-lighter, 110 231 183) / <alpha-value>)",
          clean: "rgb(var(--color-success-clean, 211 248 233) / <alpha-value>)",
        },
        info: {
          darkest: "rgb(var(--color-info-darkest, 25 45 64) / <alpha-value>)",
          dark: "rgb(var(--color-info-dark, 49 90 128) / <alpha-value>)",
          DEFAULT: "rgb(var(--color-info, 82 150 213) / <alpha-value>)",
          light: "rgb(var(--color-info-light, 169 203 234) / <alpha-value>)",
          lighter: "rgb(var(--color-info-lighter, 203 224 242) / <alpha-value>)",
          clean: "rgb(var(--color-info-clean, 234 243 250) / <alpha-value>)",
        },
      },
      backgroundColor: (theme) => ({
        ...theme("colors"),
      }),
      borderColor: (theme) => ({
        ...theme("colors"),
      }),
      ringColor: (theme) => ({
        ...theme("colors"),
      }),
      textColor: (theme) => ({
        ...theme("colors"),
      }),
      accentColor: (theme) => ({
        ...theme("colors"),
      }),
      outlineColor: (theme) => ({
        ...theme("colors"),
      }),
      placeholderColor: (theme) => ({
        ...theme("colors"),
      }),
      divideColor: (theme) => ({
        ...theme("colors"),
      }),
      fontFamily: {
        body: ["Inter", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      height: {
        "navbar-safe": "calc(100vh - 45px)",
        "document-navbar-safe": "calc(100vh - 61px)",
        "navbar-kanban-bottomnav-safe": "calc(100vh - 150px)",
        "crm-navbar-bottomnav-safe": "calc(100vh - 105px)",
        "document-navbar-bottomnav-safe": "calc(100vh - 109px)",
        "kanban-navbar-safe": "calc(100vh - 140px)",
        "navbar-bottomnav-safe": "calc(100vh - 65px)",
        "task-height": "calc(100vh - 64px)",
      },
      maxHeight: {
        "task-height": "calc(100vh - 64px)",
      },
      width: {
        "sidebar-safe": "calc(100vw - 72px)",
      },
      fontSize: {
        "display-80": [
          "80px",
          {
            lineHeight: "120%",
          },
        ],
        "display-72": [
          "72px",
          {
            lineHeight: "120%",
          },
        ],
        "heading-64": [
          "64px",
          {
            lineHeight: "120%",
          },
        ],
        "heading-56": [
          "56px",
          {
            lineHeight: "120%",
          },
        ],
        "heading-48": [
          "48px",
          {
            lineHeight: "120%",
          },
        ],
        "heading-40": [
          "40px",
          {
            lineHeight: "120%",
          },
        ],
        "heading-32": [
          "32px",
          {
            lineHeight: "120%",
          },
        ],
        "heading-24": [
          "24px",
          {
            lineHeight: "120%",
          },
        ],
        "body-18": [
          "18px",
          {
            lineHeight: "140%",
          },
        ],
        "body-16": [
          "16px",
          {
            lineHeight: "140%",
          },
        ],
        "body-14": [
          "14px",
          {
            lineHeight: "140%",
          },
        ],
        "body-13": [
          "13px",
          {
            lineHeight: "140%",
          },
        ],
        "body-12": [
          "12px",
          {
            lineHeight: "120%",
          },
        ],
        "body-11": [
          "11px",
          {
            lineHeight: "120%",
          },
        ],
        "body-10": [
          "10px",
          {
            lineHeight: "120%",
          },
        ],
        "body-8": [
          "8px",
          {
            lineHeight: "100%",
          },
        ],
      },
      boxShadow: {
        "bottom-lg": "0 8px 30px rgba(29, 29, 38, 0.20)",
        "bottom-sm": "0 16px 40px -8px rgba(29, 29, 38, 0.08)",
        "top-lg": "0px -8px 30px rgba(29, 29, 38, 0.20)",
        "top-sm": "0px -16px 40px -8px rgba(29, 29, 38, 0.08)",
        "left-lg": "-8px 0px 30px rgba(29, 29, 38, 0.20)",
        "left-sm": "-16px 0px 40px -8px rgba(29, 29, 38, 0.08)",
        "right-lg": "8px 0px 30px rgba(29, 29, 38, 0.20)",
        "right-sm": "16px 0px 40px -8px rgba(29, 29, 38, 0.08)",
        "product-card": "0px 16px 40px -8px rgba(29, 29, 38, 0.08)",
        "request-popup": "0 8px 30px -8px rgba(29, 29, 38, 0.20)",
      },
      borderWidth: {
        DEFAULT: "1px",
        0: "0",
        2: "2px",
        3: "3px",
        4: "4px",
        6: "6px",
        8: "8px",
      },
      screens: {
        xs: "520px",
      },
      keyframes: {
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "home-refresh": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(300%)" },
        },
      },
      animation: {
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        ".bg-clip-text": {
          "background-clip": "text",
          "-webkit-background-clip": "text",
          color: "transparent",
        },
        ".text-transparent": {
          "-webkit-text-fill-color": "transparent",
        },
        ".scrollbar-hide": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
      })
    },
    require("tailwindcss-animate"),
    require("tailwindcss-safe-area"),
  ],
  future: {
    hoverOnlyWhenSupported: true,
  },
}
