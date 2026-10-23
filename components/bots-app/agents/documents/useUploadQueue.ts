"use client"

import { useCallback, useEffect, useReducer, useRef } from "react"
import type { AgentActionResult, KnowledgeDocument } from "lib/attende/agents/types"
import { uploadKnowledgeFile } from "lib/attende/agents/upload"
import { hasActiveUploads, initialQueue, pendingItems, queueReducer } from "lib/attende/agents/uploadQueue"

type Upload = (agentId: string, file: File, onProgress?: (percent: number) => void) => Promise<AgentActionResult<KnowledgeDocument>>

type Options = {
  /** Once set, queued files are sent one at a time. Without it files just wait ("queue mode" of the creation wizard). */
  agentId?: string | null
  /** Names already stored for the agent, to reject duplicates. */
  existingNames?: string[]
  upload?: Upload
  onUploaded?: (document: KnowledgeDocument) => void
}

/** The files the user picked: validated locally, sent one by one, with progress and retry. */
export function useUploadQueue({ agentId = null, existingNames = [], upload = uploadKnowledgeFile, onUploaded }: Options = {}) {
  const [state, dispatch] = useReducer(queueReducer, initialQueue)
  const inFlight = useRef<Set<string>>(new Set())
  const onUploadedRef = useRef(onUploaded)
  onUploadedRef.current = onUploaded
  const namesRef = useRef(existingNames)
  namesRef.current = existingNames

  useEffect(() => {
    if (!agentId || hasActiveUploads(state)) return
    const next = pendingItems(state)[0]
    if (!next || inFlight.current.has(next.id)) return
    inFlight.current.add(next.id)
    dispatch({ type: "start", id: next.id })
    void upload(agentId, next.file, (percent) => dispatch({ type: "progress", id: next.id, percent })).then((result) => {
      inFlight.current.delete(next.id)
      if (result.success) {
        dispatch({ type: "done", id: next.id, document: result.data })
        onUploadedRef.current?.(result.data)
      } else dispatch({ type: "failed", id: next.id, error: result })
    })
  }, [state, agentId, upload])

  const addFiles = useCallback((files: File[] | FileList) => dispatch({ type: "add", files: Array.from(files), existingNames: namesRef.current }), [])
  const remove = useCallback((id: string) => dispatch({ type: "remove", id }), [])
  const retry = useCallback((id: string) => dispatch({ type: "retry", id }), [])
  const clearRejected = useCallback(() => dispatch({ type: "clearRejected" }), [])

  return { state, addFiles, remove, retry, clearRejected }
}
