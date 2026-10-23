/** Query/body field the API expects. Documents return `board`, not `boardId`. */
export function withBoardIdQuery<T extends Record<string, unknown>>(
  query: T,
  boardId?: string | null
): T & { boardId?: string } {
  const id = typeof boardId === "string" ? boardId.trim() : ""
  if (!id) return query
  return { ...query, boardId: id }
}

export function omitImmutableBoard<T extends Record<string, unknown>>(body: T): Omit<T, "board" | "boardId"> {
  const {
    board: _board,
    boardId: _boardId,
    ...rest
  } = body as T & {
    board?: unknown
    boardId?: unknown
  }
  return rest
}
