import "styles/tailwind.css"
import "styles/style.css"
import "./index.css"
import type { ReactNode } from "react"
import { botsMetadata, botsViewport } from "components/bots-app/botsMetadata"
import { BotsRootLayout } from "components/bots-app/BotsRootLayout"

export const metadata = botsMetadata
export const viewport = botsViewport

export default function Layout({ children }: { children: ReactNode }) {
  return <BotsRootLayout>{children}</BotsRootLayout>
}
