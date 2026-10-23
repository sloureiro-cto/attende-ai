import { NextResponse } from "next/server"
import { isInlineSafe } from "lib/attende/funnel/attachments"
import { attendeStream } from "lib/attende/serverApi"

/**
 * A deal attachment's file, for "open" and "download" in the funnel drawer. The bots app exposes none of JSYNQ's
 * `/api/attachments/*` proxies, so this streams `GET /documents/:id/file` with the user's own token: the API decides
 * who may read the document. Only types a browser can show safely open inline; anything else (HTML, SVG...) is
 * always a download, sandboxed and never sniffed.
 */
export const dynamic = "force-dynamic"
export const maxDuration = 60

const ID_RE = /^[a-f0-9]{24}$/i

/** `inline; filename=...` from the API, rewritten to `attachment` when needed. */
function disposition(upstream: string | null, attachment: boolean): string {
  const value = upstream?.trim() || "inline"
  const rest = value.replace(/^\s*(inline|attachment)\s*;?\s*/i, "")
  return `${attachment ? "attachment" : "inline"}${rest ? `; ${rest}` : ""}`
}

export async function GET(request: Request, { params }: { params: { documentId: string } }) {
  const documentId = params.documentId?.trim() ?? ""
  if (!ID_RE.test(documentId)) return NextResponse.json({ success: false, status: 400, reference: "FUNNEL_INVALID_IDS" }, { status: 400 })
  const download = new URL(request.url).searchParams.get("download") === "1"

  const upstream = await attendeStream(`/documents/${documentId}/file`, undefined, request.signal)
  if (!upstream) return NextResponse.json({ success: false, status: 401, reference: "AUTH_REQUIRED" }, { status: 401 })
  if (!upstream.ok || !upstream.body) {
    const status = upstream.status === 401 || upstream.status === 404 ? upstream.status : upstream.status === 403 ? 403 : 502
    return NextResponse.json({ success: false, status, reference: "FUNNEL_ATTACHMENT_UNAVAILABLE" }, { status })
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream"
  const inline = !download && isInlineSafe(contentType)
  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Disposition": disposition(upstream.headers.get("content-disposition"), !inline),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  })
  // Defense in depth for anything that is not a known-safe inline type (PDF viewers refuse a sandboxed document).
  if (!inline) headers.set("Content-Security-Policy", "sandbox; default-src 'none'")
  const length = upstream.headers.get("content-length")
  if (length) headers.set("Content-Length", length)
  return new Response(upstream.body, { status: 200, headers })
}
