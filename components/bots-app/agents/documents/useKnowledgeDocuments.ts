"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { listAgentKnowledgeAction } from "actions/attende/agents"
import type { AgentActionError, KnowledgeDocument } from "lib/attende/agents/types"

const POLL_MS = 5000

export const isReading = (doc: Pick<KnowledgeDocument, "indexStatus">) => doc.indexStatus === "pending" || doc.indexStatus === "processing"

/**
 * The agent's documents with their real reading status (`indexStatus` from the API). Refreshes every few seconds
 * while a document is still waiting or being read, so "Ready" only appears once the server says so.
 */
export function useKnowledgeDocuments(agentId: string | null, initial: KnowledgeDocument[] = [], initialError: AgentActionError | null = null) {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(initial)
  const [error, setError] = useState<AgentActionError | null>(initialError)
  const [refreshing, setRefreshing] = useState(false)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!agentId) return
    setRefreshing(true)
    const result = await listAgentKnowledgeAction(agentId)
    if (!alive.current) return
    setRefreshing(false)
    if (result.success) {
      setDocuments(result.data)
      setError(null)
    } else setError(result)
  }, [agentId])

  const reading = documents.some(isReading)
  useEffect(() => {
    if (!reading || !agentId) return
    const timer = setInterval(() => void refresh(), POLL_MS)
    return () => clearInterval(timer)
  }, [reading, refresh, agentId])

  return { documents, setDocuments, error, refreshing, refresh }
}
