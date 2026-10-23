/**
 * @jest-environment node
 */
import { GET } from "./route"

const attendeStream = jest.fn()
jest.mock("lib/attende/serverApi", () => ({ attendeStream: (...a: unknown[]) => attendeStream(...a) }))

const ID = "0123456789abcdef01234567"

beforeEach(() => attendeStream.mockReset())

describe("funnel CSV export route", () => {
  it("streams the backend CSV with validated filters only", async () => {
    attendeStream.mockResolvedValue(
      new Response("name\nAna\n", { status: 200, headers: { "content-type": "text/csv", "content-disposition": 'attachment; filename="f.csv"', "x-export-row-cap": "10000" } })
    )
    const res = await GET(new Request(`http://app/funnel/export?stage=${ID},bad&channel=sms&label=<x>&mask=1&q=a&cursor=zzz`))
    expect(attendeStream).toHaveBeenCalledWith("/attende/funnel/export.csv", { stage: ID, channel: "sms", sort: "updated_desc", maskPhone: "true" }, expect.anything())
    expect(res.status).toBe(200)
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="f.csv"')
    expect(res.headers.get("x-export-row-cap")).toBe("10000")
    expect(await res.text()).toBe("name\nAna\n")
  })

  it("answers 401 without a session and forwards backend errors", async () => {
    attendeStream.mockResolvedValueOnce(null)
    expect((await GET(new Request("http://app/funnel/export"))).status).toBe(401)
    attendeStream.mockResolvedValueOnce(new Response(JSON.stringify({ reference: "ATTENDE_TRIAL_EXPIRED" }), { status: 402 }))
    const res = await GET(new Request("http://app/funnel/export"))
    expect(res.status).toBe(402)
    expect(await res.json()).toMatchObject({ reference: "ATTENDE_TRIAL_EXPIRED" })
  })
})
