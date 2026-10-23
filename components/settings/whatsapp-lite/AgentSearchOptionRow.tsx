"use client"

import { ChatAgentAvatar } from "app/agent-chat/components/ChatAgentAvatar"

export function AgentSearchOptionRow({ name, icon }: { name: string; icon?: string | null }) {
  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      <ChatAgentAvatar icon={icon} name={name} size="sm" />
      <span className="min-w-0 truncate text-left text-body-14 text-neutral-900">{name}</span>
    </div>
  )
}
