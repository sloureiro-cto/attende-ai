// Webhook trigger of an automation: no session, the per-automation secret (`X-Attende-Secret`) authenticates.
export { automationWebhook as POST } from "server/modules/automations/handlers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60
