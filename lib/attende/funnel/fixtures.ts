import type { ContactRow, FunnelPage, FunnelRow, FunnelStage, StagesData } from "./types"

export const id = (n: number): string => n.toString(16).padStart(24, "0")

export const stage = (n: number, over: Partial<FunnelStage> = {}): FunnelStage => ({ id: id(100 + n), name: `Stage ${n}`, color: "#3366ff", order: n, kind: "open", ...over })

export function row(n: number, over: Partial<FunnelRow> = {}): FunnelRow {
  return {
    cardId: id(n),
    title: `Lead ${n}`,
    contact: { id: id(1000 + n), name: `Ana ${n}`, phone: `+5511900000${String(n).padStart(3, "0")}`, email: `ana${n}@x.com`, avatarUrl: null },
    stage: stage(1),
    deal: { value: 100 * n, currency: "BRL", status: "open" },
    owner: { id: id(2000), name: "Owner", avatarUrl: null },
    labels: [{ id: id(3000), text: "VIP", color: "#ffaa00" }],
    sources: [{ id: id(4000), text: "Ads" }],
    lastMessageAt: "2026-10-22T10:00:00.000Z",
    conversation: { channel: "whatsapp", id: id(5000 + n), sessionId: id(6000), lastMessageAt: "2026-10-22T10:00:00.000Z", handling: "ai_agent" },
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-22T10:00:00.000Z",
    ...over,
  }
}

export const page = (rows: FunnelRow[], over: Partial<FunnelPage> = {}): FunnelPage => ({
  items: rows,
  nextCursor: null,
  hasMore: false,
  partial: false,
  board: { id: id(9), projectId: id(8) },
  ...over,
})

export const stagesData = (over: Partial<StagesData> = {}): StagesData => ({
  board: { id: id(9), projectId: id(8) },
  stages: [
    { ...stage(1), count: 12 },
    { ...stage(2), count: 4 },
    { ...stage(3, { kind: "won" }), count: 2 },
  ],
  total: 18,
  ...over,
})

export function contact(n: number, over: Partial<ContactRow> = {}): ContactRow {
  return {
    id: id(1000 + n),
    name: `Contact ${n}`,
    phone: "+5511900000000",
    email: null,
    avatarUrl: null,
    responsibleUserId: null,
    deals: { total: 2, open: 1, won: 1, lost: 0 },
    latestStage: stage(1),
    latestCardId: id(n),
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-22T10:00:00.000Z",
    ...over,
  }
}
