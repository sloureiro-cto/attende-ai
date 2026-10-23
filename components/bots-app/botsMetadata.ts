import type { Metadata, Viewport } from "next"
import { BOTS_BRAND } from "./brand"

export const botsMetadata: Metadata = {
  title: { default: BOTS_BRAND.name, template: `%s · ${BOTS_BRAND.name}` },
  description: "Design guided conversation flows for WhatsApp, Instagram and SMS, and see where every lead goes.",
  icons: { icon: "/bots-assets/favicon.svg" },
  // The app is for signed-in customers only: keep it out of search indexes.
  robots: { index: false, follow: false, nocache: true },
}

export const botsViewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" }
