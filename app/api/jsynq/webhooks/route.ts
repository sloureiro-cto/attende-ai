// Signed server-to-server call: the handler reads the raw body to verify the signature.
export { postJsynqWebhook as POST } from "server/modules/jsynq-webhooks/handlers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
