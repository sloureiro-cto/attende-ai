export type MessagingChannelLineRule = {
  enabled?: boolean
  limit?: number
  unpaidLimit?: number
}

export function basePlanSlug(slug: string | null | undefined): string {
  return (slug ?? "").replace(/-(monthly|yearly)$/i, "").toLowerCase()
}

export function isMessagingChannelPlanError(message: string): boolean {
  return /not included in your current plan|maximum number of connected accounts for this channel/i.test(
    message
  )
}

/** Free workspaces cannot add WhatsApp/IG/SMS lines — those are paid add-ons. */
export function canAddMessagingChannelLine(args: {
  planSlug?: string | null
  channelRule?: MessagingChannelLineRule | null
}): boolean {
  if (basePlanSlug(args.planSlug) === "free") return false
  const rule = args.channelRule
  if (!rule) return true
  if (rule.enabled === false) return false
  return true
}
