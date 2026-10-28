// Signed server-to-server call: the handler reads the raw body to verify the signature.
export { postStripeWebhook as POST } from "server/modules/billing/handlers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
