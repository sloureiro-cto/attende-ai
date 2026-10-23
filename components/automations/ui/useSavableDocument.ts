"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/** The slice of an `ActionResult` the save protocol needs. */
type SaveOutcome<T extends { updatedAt: string }, E = unknown> =
  | { success: true; data: T }
  | ({ success: false; status?: number; error?: string } & E)

type Options = {
  /** Version stamp of the loaded document (`undefined` for a document that was never saved). */
  initialUpdatedAt?: string
  /** A new document starts dirty; an opened one starts clean. */
  initialDirty?: boolean
  /** Latest server stamp, used by "overwrite" to retry a save that lost an optimistic-concurrency race. */
  fetchUpdatedAt?: () => Promise<string | null>
}

/**
 * The save protocol shared by the rule editor and the bot builder: dirty tracking that survives edits
 * made while a save is in flight, an optimistic-concurrency stamp (`updatedAt`) and a conflict state
 * that can always be resolved (overwrite or reload), never left dead.
 */
export function useSavableDocument<T extends { updatedAt: string }, E = unknown>({ initialUpdatedAt, initialDirty = false, fetchUpdatedAt }: Options = {}) {
  const [dirty, setDirty] = useState(initialDirty)
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt)
  // Bumped on every edit: a save clears "unsaved" only if nothing changed while it was in flight.
  const editRev = useRef(0)
  const savingRef = useRef(false)
  const updatedAtRef = useRef(initialUpdatedAt)
  type Run = (expectedUpdatedAt?: string) => Promise<SaveOutcome<T, E>>
  type Done = (outcome: SaveOutcome<T, E>) => void
  const lastRun = useRef<{ run: Run; onDone?: Done } | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const markDirty = useCallback(() => {
    editRev.current += 1
    setDirty(true)
  }, [])

  const stamp = useCallback((value: string | undefined) => {
    updatedAtRef.current = value
    setUpdatedAt(value)
  }, [])

  /**
   * Runs one save. `null` when a save is already in flight. `onDone` reacts to the outcome (toasts,
   * redirects) and is kept so that resolving a conflict by overwriting runs the very same follow-up.
   */
  const save = useCallback(
    async (run: Run, onDone?: Done): Promise<SaveOutcome<T, E> | null> => {
      if (savingRef.current) return null
      savingRef.current = true
      setSaving(true)
      setConflict(false)
      lastRun.current = { run, onDone }
      const revAtSave = editRev.current
      let outcome: SaveOutcome<T, E>
      try {
        outcome = await run(updatedAtRef.current)
      } finally {
        savingRef.current = false
        if (mounted.current) setSaving(false)
      }
      if (!mounted.current) return outcome
      if (outcome.success) {
        if (editRev.current === revAtSave) setDirty(false)
        stamp(outcome.data.updatedAt)
        lastRun.current = null
      } else if (outcome.status === 409) {
        setConflict(true)
      }
      onDone?.(outcome)
      return outcome
    },
    [stamp]
  )

  /** Resolves a conflict by taking the server's current stamp and repeating the last save. */
  const overwrite = useCallback(async (): Promise<SaveOutcome<T, E> | null> => {
    const last = lastRun.current
    if (!last) {
      setConflict(false)
      return null
    }
    const fresh = fetchUpdatedAt ? await fetchUpdatedAt() : null
    if (fresh) stamp(fresh)
    return save(last.run, last.onDone)
  }, [fetchUpdatedAt, save, stamp])

  const dismissConflict = useCallback(() => setConflict(false), [])

  return { dirty, saving, conflict, updatedAt, markDirty, save, overwrite, dismissConflict, setConflict }
}
