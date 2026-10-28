/**
 * @jest-environment node
 */
import { GET } from "./route"

jest.mock("auth", () => ({ auth: jest.fn() }))

const callAttende = jest.fn()
const userBearer = jest.fn()
jest.mock("lib/attende/serverApi", () => ({
  ...jest.requireActual("lib/attende/serverApi"),
  callAttende: (...a: unknown[]) => callAttende(...a),
  userBearer: () => userBearer(),
}))

const ID = "0123456789abcdef01234567"

beforeEach(() => {
  callAttende.mockReset()
  userBearer.mockReset()
  userBearer.mockResolvedValue("Bearer tok")
})

describe("funnel CSV export route", () => {
  it("streams the Attende CSV with validated filters only", async () => {
    callAttende.mockResolvedValue(
      new Response("name\nAna\n", {
        status: 200,
        headers: { "content-type": "text/csv", "content-disposition": 'attachment; filename="f.csv"', "x-export-row-cap": "10000" },
      })
    )
    const res = await GET(new Request(`http://app/funnel/export?stage=${ID},bad&channel=sms&label=<x>&mask=1&q=a&cursor=zzz`))
    // The conversation filters are not applied by any card list: they are dropped like any invalid value.
    expect(callAttende).toHaveBeenCalledWith(`/attende/funnel/export.csv?stage=${ID}&sort=updated_desc&maskPhone=true`, expect.objectContaining({ headers: { Authorization: "Bearer tok" } }))
    expect(res.status).toBe(200)
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="f.csv"')
    expect(res.headers.get("x-export-row-cap")).toBe("10000")
    expect(await res.text()).toBe("name\nAna\n")
  })

  it("answers 401 without a session and forwards API errors", async () => {
    userBearer.mockResolvedValueOnce(null)
    expect((await GET(new Request("http://app/funnel/export"))).status).toBe(401)
    expect(callAttende).not.toHaveBeenCalled()
    callAttende.mockResolvedValueOnce(new Response(JSON.stringify({ reference: "FUNNEL_NO_BOARD" }), { status: 404 }))
    const res = await GET(new Request("http://app/funnel/export"))
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ reference: "FUNNEL_NO_BOARD" })
  })
})
