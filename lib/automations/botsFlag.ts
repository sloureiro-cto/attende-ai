/** User context sent to Statsig by the root layout, so server and client evaluate the same gates. */
export function botsFlagUser(session: { user?: { id?: string | null; email?: string | null; workspaceId?: string | null } } | null) {
  return {
    userID: session?.user?.id ?? "anonymous123",
    custom: { workspaceIds: [session?.user?.workspaceId ?? ""] },
    customIDs: {
      stableID: session?.user?.id ?? "anonymous123",
      email: session?.user?.email ?? "anonymous123@example.com",
    },
  }
}
