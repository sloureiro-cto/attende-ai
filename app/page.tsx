import { redirect } from "next/navigation"

/** The entry point is the login page; it sends signed-in users on to the app. */
export default function Page() {
  redirect("/login")
}
