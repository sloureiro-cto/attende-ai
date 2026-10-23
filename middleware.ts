import { NextRequest } from "next/server"
import { handleBotsAppRequest } from "middlewares/bots-app-middleware"

export default function middleware(req: NextRequest) {
  return handleBotsAppRequest(req)
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
}
