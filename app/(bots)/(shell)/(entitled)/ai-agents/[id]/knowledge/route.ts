import { NextResponse } from "next/server"
import { agentsFetch } from "lib/attende/agents/api"
import type { KnowledgeDocument } from "lib/attende/agents/types"

/**
 * Document upload. Server actions cap request bodies far below 20 MB, so uploads go through this route handler,
 * which forwards the multipart body to the backend with the user's token. It lives under /agents so the app
 * middleware already requires a session for it.
 */
export const maxDuration = 60

export async function POST(request: Request, { params }: { params: { id: string } }) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ success: false, status: 400, code: "ATTENDE_AGENT_FILE_REJECTED", details: { reason: "missing" } }, { status: 400 })
  }
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, status: 400, code: "ATTENDE_AGENT_FILE_REJECTED", details: { reason: "missing" } }, { status: 400 })
  }
  const outgoing = new FormData()
  outgoing.append("file", file, file.name)
  const result = await agentsFetch<KnowledgeDocument>(`/${encodeURIComponent(params.id)}/knowledge`, { method: "POST", form: outgoing, timeoutMs: 55_000 })
  return NextResponse.json(result, { status: result.success ? 201 : result.status || 502 })
}
