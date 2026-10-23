"use client"

import dynamic from "next/dynamic"
import type { WhatsAppSession } from "actions/whatsapp-lite/types"
import { useWorkspace } from "context/WorkspaceContext"
import { BOTS_BRAND } from "../brand"

/**
 * Attende-ai's own "connect a number" dialog (QR pairing and official Meta API). It runs the same backend
 * actions and plan checks as the JSYNQ modal. Loaded lazily: only needed when the user connects a number.
 */
const ConnectDialog = dynamic(() => import("./ConnectWhatsAppDialog").then((m) => m.ConnectWhatsAppDialog), { ssr: false })

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Resume the QR step of an existing session (reconnect) instead of starting a new pairing. */
  initialSession?: WhatsAppSession | null
  /** Called when a session is created or changes while the dialog is open. */
  onSessionUpsert: (session: WhatsAppSession) => void
}

export function WhatsAppConnect({ open, onOpenChange, initialSession = null, onSessionUpsert }: Props) {
  const { selectedWorkspace } = useWorkspace()
  if (!open) return null
  return (
    <ConnectDialog
      open={open}
      onOpenChange={onOpenChange}
      workspaceName={selectedWorkspace?.name?.trim() || BOTS_BRAND.name}
      initialSession={initialSession}
      onSessionUpsert={onSessionUpsert}
    />
  )
}
