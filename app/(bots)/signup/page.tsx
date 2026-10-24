import { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { getSignupPlansAction } from "actions/attende/signup"
import { auth } from "auth"
import { BotsBrandPanel } from "components/bots-app/BotsBrandPanel"
import { BrandMark } from "components/bots-app/BrandMark"
import { SignupFlow } from "components/bots-app/signup/SignupFlow"
import { readAttendeEntitlement } from "lib/automations/server/botsEntitlement"

export const metadata: Metadata = { title: "Create account" }

type Props = { searchParams: { plan?: string; existing?: string } }

/**
 * Public acquisition page. A signed-in user without a workspace is resumed at the card. A signed-in user with a workspace
 * already finished it, except an existing JSYNQ account that signed in to start its trial (`?existing=1`, after a
 * `USER_EXISTS_UNMANAGED` verify): it goes to the card unless its workspace already has an Attende-ai plan.
 */
export default async function SignupPage({ searchParams }: Props) {
  const [session, catalog] = await Promise.all([auth(), getSignupPlansAction()])
  if (session?.user?.workspaceId) {
    if (searchParams.existing !== "1") redirect("/start")
    // Unknown (backend down) also goes to the card: start-trial answers with the real reason.
    if ((await readAttendeEntitlement()) === true) redirect("/start")
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="flex flex-col items-center justify-center gap-10 px-5 py-10 sm:px-10">
        <BrandMark className="lg:hidden" size={34} />
        <Suspense fallback={null}>
          <SignupFlow catalog={catalog} initialPlan={searchParams.plan} resumeAtCard={Boolean(session?.user)} />
        </Suspense>
      </section>
      <BotsBrandPanel />
    </main>
  )
}
