"use client"

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react"
import type { IDocumentAttachment, IFileAttachment } from "app/_types/Attachment"
import { CardType, ICard } from "app/_types/Card"
import { IComment } from "app/_types/Comment"
import { ITimeTrackerEntry } from "app/_types/TimeTrackerEntry"
import { entityId } from "lib/entityId"

interface CreatingCardData {
  isCreating: boolean
  column?: string
  sprint?: string
  epic?: string
  title?: string
  cardType?: CardType
  position?: "top" | "bottom"
  isBacklog?: boolean
  epicPosition?: number
  date?: Date
  startDate?: Date
  /** Prefill from WhatsApp/messages → CRM create-lead handoff */
  contactName?: string
  contactPhone?: string
}

interface CardContextType {
  cards: ICard[] | null
  setCards: React.Dispatch<React.SetStateAction<ICard[] | null>>
  isLoading: boolean
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
  cardsLoading: boolean
  setTasksLoading: React.Dispatch<React.SetStateAction<boolean>>
  tasksLoading: boolean
  setCardsLoading: React.Dispatch<React.SetStateAction<boolean>>
  currentCardLoading: boolean
  setCurrentCardLoading: React.Dispatch<React.SetStateAction<boolean>>
  currentCard: ICard | null
  setCurrentCard: React.Dispatch<React.SetStateAction<ICard | null>>
  currentCardSubtasks: ICard[] | null
  setCurrentCardSubtasks: React.Dispatch<React.SetStateAction<ICard[] | null>>
  isCommentsLoading: boolean
  setIsCommentsLoading: React.Dispatch<React.SetStateAction<boolean>>
  filter: Filter
  setFilter: React.Dispatch<React.SetStateAction<Filter>>
  attachments: IFileAttachment[] | null
  setAttachments: React.Dispatch<React.SetStateAction<IFileAttachment[] | null>>
  documents: IDocumentAttachment[] | null
  setDocuments: React.Dispatch<React.SetStateAction<IDocumentAttachment[] | null>>
  comments: IComment[] | null
  setComments: React.Dispatch<React.SetStateAction<IComment[] | null>>
  selectedCardId: string | null
  setSelectedCardId: React.Dispatch<React.SetStateAction<string | null>>
  isCreatingCard: CreatingCardData
  setIsCreatingCard: React.Dispatch<React.SetStateAction<CreatingCardData>>
  clearIsCreatingCard: () => void
  incrementCards: (cards: ICard[], replace?: boolean) => void
  updateCardTimeEntries: (cardId: string, timeEntries: ITimeTrackerEntry[]) => void
}

const CardContext = createContext<CardContextType | undefined>(undefined)

export const useCard = () => {
  const context = useContext(CardContext)
  if (!context) {
    throw new Error("useCard must be used within a CardProvider")
  }
  return context
}

export const useOptionalCard = () => useContext(CardContext)
export interface Filter {
  project?: string[]
  currentProject?: string
  title: string
  description: string
  slug: string
  assignee: string[]
  unassigned: boolean
  reporter: string[]
  priorities: string[]
  status?: string[] // For CRM: status levels 0-3 (none, cold, warm, hot)
  labels: string[]
  leadSources?: string[] // For CRM: lead source IDs
  deadline?: {
    type?: string // "noDeadline", "overdue", "oneDayFromNow", etc., or "custom"
    range?: {
      from?: Date
      to?: Date
    }
  }
  startDate?: {
    type?: string // "noStartDate", "overdue", "oneDayFromNow", etc., or "custom"
    range?: {
      from?: Date
      to?: Date
    }
  }
  createdAt?: {
    type?: string // "oneDayAgo", "threeDaysAgo", "oneWeekAgo", etc., or "custom"
    range?: {
      from?: Date
      to?: Date
    }
  }
  epics?: string[]
}
export const CardProvider = ({ children }: { children: ReactNode }) => {
  const [cards, setCards] = useState<ICard[] | null>(null)
  const [filter, setFilter] = useState<Filter>({
    project: [],
    currentProject: "",
    title: "",
    description: "",
    slug: "",
    assignee: [],
    unassigned: false,
    reporter: [],
    priorities: [],
    status: [],
    labels: [],
    leadSources: [],
    deadline: undefined,
    startDate: undefined,
    createdAt: undefined,
    epics: [],
  })
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [currentCard, setCurrentCard] = useState<ICard | null>(null)
  const [currentCardSubtasks, setCurrentCardSubtasks] = useState<ICard[] | null>(null)
  const [attachments, setAttachments] = useState<IFileAttachment[] | null>(null)
  const [documents, setDocuments] = useState<IDocumentAttachment[] | null>(null)
  const [isCommentsLoading, setIsCommentsLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [cardsLoading, setCardsLoading] = useState(false)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [currentCardLoading, setCurrentCardLoading] = useState(false)
  const [comments, setComments] = useState<IComment[] | null>(null)
  const [isCreatingCard, setIsCreatingCard] = useState<CreatingCardData>({
    isCreating: false,
  })

  const incrementCards = (cards: ICard[], replace = false) => {
    setCards((prev) => {
      const newCardsToAdd = cards.filter((card) => !prev?.some((c) => entityId(c._id) === entityId(card._id)))

      if (!replace) {
        return [...(prev ?? []), ...newCardsToAdd]
      }

      const oldCardsWithNewValues = prev?.map((card) => {
        const newCard = cards.find((c) => entityId(c._id) === entityId(card._id))
        return newCard ? newCard : card
      })

      return [...(oldCardsWithNewValues ?? []), ...newCardsToAdd]
    })
  }

  const clearIsCreatingCard = useCallback(() => {
    setIsCreatingCard({
      isCreating: false,
      column: undefined,
      sprint: undefined,
      epic: undefined,
      title: undefined,
      position: undefined,
      isBacklog: undefined,
      epicPosition: undefined,
      date: undefined,
      startDate: undefined,
      contactName: undefined,
      contactPhone: undefined,
    })
  }, [])

  const updateCardTimeEntries = (cardId: string, timeEntries: ITimeTrackerEntry[]) => {
    setCards((prev) =>
      prev == null ? null : prev.map((card) => (card._id === cardId ? { ...card, timeEntries } : card))
    )
    setCurrentCard((prev) => (prev && (prev._id ?? "").toString() === cardId ? { ...prev, timeEntries } : prev))
  }

  // Clear related state when the selected card changes — not when currentCard hydrates,
  // so comments/attachments can be fetched in parallel with getCard.
  const previousSelectedCardIdRef = useRef<string | null>(null)
  useEffect(() => {
    const selectedId = selectedCardId ? selectedCardId.toString() : null
    if (selectedId !== previousSelectedCardIdRef.current) {
      setComments(null)
      setAttachments(null)
      setDocuments(null)
      setCurrentCardSubtasks(null)
      previousSelectedCardIdRef.current = selectedId
    }
  }, [selectedCardId])

  return (
    <CardContext.Provider
      value={{
        cards,
        setCards,
        isLoading,
        setIsLoading,
        currentCard,
        setCurrentCard,
        currentCardSubtasks,
        setCurrentCardSubtasks,
        isCommentsLoading,
        setIsCommentsLoading,
        filter,
        setFilter,
        attachments,
        setAttachments,
        documents,
        setDocuments,
        cardsLoading,
        setCardsLoading,
        tasksLoading,
        setTasksLoading,
        currentCardLoading,
        setCurrentCardLoading,
        comments,
        setComments,
        selectedCardId,
        setSelectedCardId,
        isCreatingCard,
        setIsCreatingCard,
        clearIsCreatingCard,
        incrementCards,
        updateCardTimeEntries,
      }}
    >
      {children}
    </CardContext.Provider>
  )
}
