import { Metadata } from "next"
import { NotEntitledView } from "components/bots-app/NotEntitledView"

export const metadata: Metadata = { title: "Not enabled" }

export default function NotEntitledPage() {
  return <NotEntitledView />
}
