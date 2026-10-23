import { ReactNode } from "react"
import { BotsShell } from "components/bots-app/BotsShell"
import { LinesStatusPillLive } from "components/bots-app/LinesStatusPillLive"
import { requireBotsSession } from "components/bots-app/server/guards"

/** Every signed-in page: requires a session, renders inside the shell. */
export default async function BotsShellLayout({ children }: { children: ReactNode }) {
  await requireBotsSession()
  return (
    <BotsShell linesSlot={<LinesStatusPillLive />} linesCompactSlot={<LinesStatusPillLive variant="icon" />}>
      {children}
    </BotsShell>
  )
}
