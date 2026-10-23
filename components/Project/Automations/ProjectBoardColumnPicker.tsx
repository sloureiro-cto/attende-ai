"use client"

import { useEffect, useMemo, useState } from "react"
import type { IColumn } from "app/_types/Column"
import { SearchSelectPopover } from "../../settings/whatsapp-lite/SearchSelectPopover"
import { columnBoardId, type ProjectBoardRef } from "lib/projects/projectBoardRefs"

const NONE = "__none__"

type ProjectBoardColumnPickerProps = {
  boards: ProjectBoardRef[]
  columns: IColumn[]
  value: string
  onChange: (columnId: string) => void
  onBoardChange?: (boardId: string) => void
  boardValue?: string
  noneLabel: string
  boardPlaceholder: string
  columnPlaceholder: string
  searchBoardPlaceholder?: string
  searchColumnPlaceholder?: string
  emptyLabel?: string
  portalClassNames?: string
  triggerClassNames?: string
  disabled?: boolean
}

export function ProjectBoardColumnPicker({
  boards,
  columns,
  value,
  onChange,
  onBoardChange,
  boardValue,
  noneLabel,
  boardPlaceholder,
  columnPlaceholder,
  searchBoardPlaceholder,
  searchColumnPlaceholder,
  emptyLabel,
  triggerClassNames,
  disabled,
}: ProjectBoardColumnPickerProps) {
  const selected = columns.find((column) => column._id === value)
  const [boardId, setBoardId] = useState(boardValue ?? "")
  const empty = emptyLabel ?? noneLabel

  useEffect(() => {
    const fromColumn = selected ? columnBoardId(selected.board) : ""
    if (fromColumn) {
      setBoardId(fromColumn)
      return
    }
    if (boardValue) {
      setBoardId(boardValue)
      return
    }
    if (value) return
    if (!boardId && boards.length === 1 && boards[0]) {
      setBoardId(boards[0].boardId)
      onBoardChange?.(boards[0].boardId)
    }
  }, [boardValue, selected, boards, boardId, value, onBoardChange])

  const columnsForBoard = useMemo(() => {
    if (!boardId) return columns
    const filtered = columns.filter((column) => columnBoardId(column.board) === boardId)
    if (filtered.length > 0) {
      if (selected && !filtered.some((column) => column._id === selected._id)) {
        return [selected, ...filtered]
      }
      return filtered
    }
    // Keep the list usable when `column.board` is a populated object or the
    // fetch returned another board's columns — an empty dropdown looks like
    // the column "won't select". Don't prepend a column that is already in the list.
    if (selected && !columns.some((column) => column._id === selected._id)) {
      return [selected, ...columns]
    }
    return columns
  }, [boardId, columns, selected])

  const boardItems = useMemo(() => {
    const items = [
      { value: NONE, label: boardPlaceholder },
      ...boards.map((board) => ({ value: board.boardId, label: board.title })),
    ]
    if (boardId && !items.some((item) => item.value === boardId)) {
      items.push({ value: boardId, label: boardId })
    }
    return items
  }, [boards, boardPlaceholder, boardId])

  const columnItems = useMemo(() => {
    const items = [
      { value: NONE, label: noneLabel },
      ...columnsForBoard.map((column) => ({ value: column._id, label: column.title || column._id })),
    ]
    if (value && value !== NONE && !items.some((item) => item.value === value)) {
      items.push({ value, label: selected?.title || value })
    }
    return items
  }, [columnsForBoard, noneLabel, value, selected?.title])

  return (
    <div className="flex flex-col gap-2">
      <SearchSelectPopover
        value={boardId || NONE}
        onChange={(next) => {
          const nextBoard = next === NONE ? "" : next
          setBoardId(nextBoard)
          // One write. A follow-up onChange("") was built from the previous action and put the old board back.
          onBoardChange?.(nextBoard)
        }}
        items={boardItems}
        placeholder={boardPlaceholder}
        searchPlaceholder={searchBoardPlaceholder ?? boardPlaceholder}
        emptyLabel={empty}
        disabled={disabled}
        triggerClassNames={triggerClassNames}
      />
      <SearchSelectPopover
        value={value ? value : NONE}
        onChange={(next) => {
          const columnId = next === NONE ? "" : next
          const col = columns.find((c) => c._id === columnId)
          const nextBoard = col ? columnBoardId(col.board) : ""
          if (nextBoard) setBoardId(nextBoard)
          // The parent stores the column and its board together. onBoardChange would clear the column
          // it just received, because that handler still sees the previous empty column.
          onChange(columnId)
        }}
        items={columnItems}
        placeholder={columnPlaceholder}
        searchPlaceholder={searchColumnPlaceholder ?? columnPlaceholder}
        emptyLabel={empty}
        disabled={disabled || !boardId}
        triggerClassNames={triggerClassNames}
      />
    </div>
  )
}
