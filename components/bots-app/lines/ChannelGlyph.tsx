import { Instagram, MessageCircle, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AutomationChannel } from "lib/automations/types"

const GLYPH: Record<AutomationChannel, { Icon: typeof MessageCircle; tone: string }> = {
  whatsapp: { Icon: MessageCircle, tone: "bg-primary-clean text-primary-dark" },
  instagram: { Icon: Instagram, tone: "bg-info-clean text-info-darkest" },
  sms: { Icon: MessageSquare, tone: "bg-neutral-10 text-neutral-600" },
}

/** Channel icon on a tinted tile. Decorative: the channel is always named in text next to it. */
export function ChannelGlyph({ channel, className }: { channel: AutomationChannel; className?: string }) {
  const { Icon, tone } = GLYPH[channel]
  return (
    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tone, className)} aria-hidden>
      <Icon className="size-5" />
    </span>
  )
}
