import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getAttendeBillingAction } from "actions/attende/billing"
import { AcquisitionFrame } from "components/bots-app/acquisition/AcquisitionHeading"
import { BillingView } from "components/bots-app/billing/BillingView"
import { BOTS_ROUTES } from "components/bots-app/brand"

export const metadata: Metadata = { title: "Plan and billing" }

/**
 * Plan, trial clock, limits, invoices and the Stripe portal. It lives in the shell group, NOT in `(entitled)`: a workspace
 * whose trial ended or whose subscription was canceled loses the bots entitlement, and this is the page where it comes back.
 */
export default async function BillingPage() {
  const initial = await getAttendeBillingAction()
  if (!initial.success && initial.error === "no_workspace") redirect(BOTS_ROUTES.workspaces)

  return (
    <AcquisitionFrame titleKey="billTitle" subtitleKey="billSubtitle">
      <BillingView initial={initial} />
    </AcquisitionFrame>
  )
}
