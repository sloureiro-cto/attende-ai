import { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { auth } from "auth"
import { BotsBrandPanel } from "components/bots-app/BotsBrandPanel"
import { BotsLoginForm } from "components/bots-app/BotsLoginForm"
import { BOTS_ROUTES } from "components/bots-app/brand"
import { BrandMark } from "components/bots-app/BrandMark"
import { safeBotsCallback } from "components/bots-app/safeBotsCallback"

export const metadata: Metadata = { title: "Sign in" }

type Props = { searchParams: { callbackUrl?: string } }

export default async function BotsLoginPage({ searchParams }: Props) {
  const session = await auth()
  if (session?.user) redirect(safeBotsCallback(searchParams.callbackUrl, BOTS_ROUTES.bots))

  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="flex flex-col items-center justify-center gap-10 px-5 py-10 sm:px-10">
        <BrandMark className="lg:hidden" size={34} />
        <Suspense fallback={null}>
          <BotsLoginForm googleEnabled={googleEnabled} />
        </Suspense>
      </section>
      <BotsBrandPanel />
    </main>
  )
}
