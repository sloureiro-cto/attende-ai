import { NextResponse } from "next/server"
import { filtersToApiQuery, parseFunnelParams } from "lib/attende/funnel/model"
import { buildQuery, callAttende, userBearer } from "lib/attende/serverApi"

/**
 * CSV export of the funnel with the current filters: the Attende API's `GET /api/attende/funnel/export.csv`, which
 * reads the board page by page from JSYNQ and stops at 10,000 rows. This handler pipes that stream to the browser with
 * the user's session token, so the file never has to fit in memory here. The query string is re-parsed (ids and enums
 * validated), never forwarded as is.
 */
export const dynamic = "force-dynamic"
export const maxDuration = 60

const PASS_HEADERS = ["content-type", "content-disposition", "x-export-row-cap"] as const

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const state = parseFunnelParams(searchParams)
  const query = filtersToApiQuery(state.filters, { maskPhone: state.maskPhone })
  const authorization = await userBearer()
  if (!authorization) return NextResponse.json({ success: false, status: 401, reference: "AUTH_REQUIRED" }, { status: 401 })
  let upstream: Response
  try {
    upstream = await callAttende(`/attende/funnel/export.csv${buildQuery(query)}`, { headers: { Authorization: authorization }, timeoutMs: 60_000 })
  } catch {
    return NextResponse.json({ success: false, status: 502 }, { status: 502 })
  }
  if (!upstream.ok || !upstream.body) {
    let reference: string | undefined
    try {
      const body = (await upstream.json()) as { reference?: unknown }
      reference = typeof body.reference === "string" ? body.reference : undefined
    } catch {
      reference = undefined
    }
    return NextResponse.json({ success: false, status: upstream.status, reference }, { status: upstream.status || 502 })
  }
  const headers = new Headers({ "Cache-Control": "no-store" })
  for (const name of PASS_HEADERS) {
    const value = upstream.headers.get(name)
    if (value) headers.set(name, value)
  }
  if (!headers.has("content-type")) headers.set("content-type", "text/csv; charset=utf-8")
  if (!headers.has("content-disposition")) headers.set("content-disposition", 'attachment; filename="funnel.csv"')
  return new Response(upstream.body, { status: 200, headers })
}
