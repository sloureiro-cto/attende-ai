let activeMessagingInboxSocketCount = 0

export function registerMessagingInboxSocketConnected(): void {
  activeMessagingInboxSocketCount += 1
}

export function unregisterMessagingInboxSocketConnected(): void {
  activeMessagingInboxSocketCount = Math.max(0, activeMessagingInboxSocketCount - 1)
}

export function isMessagingInboxSocketConnected(): boolean {
  return activeMessagingInboxSocketCount > 0
}
