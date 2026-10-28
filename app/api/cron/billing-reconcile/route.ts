// Vercel Cron (vercel.json), `Authorization: Bearer <CRON_SECRET>`.
export { billingReconcileCron as GET } from "server/cron"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60
