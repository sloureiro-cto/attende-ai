import { Metadata } from "next"
import { AccountView } from "components/bots-app/AccountView"

export const metadata: Metadata = { title: "My account" }

export default function AccountPage() {
  return <AccountView />
}
