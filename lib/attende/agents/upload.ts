import type { AgentActionResult, KnowledgeDocument } from "./types"

/** Where uploads go: a route handler under /agents (server actions cap request bodies far below 20 MB). */
export const uploadUrl = (agentId: string) => `/ai-agents/${encodeURIComponent(agentId)}/knowledge`

type XhrLike = Pick<XMLHttpRequest, "open" | "send" | "abort" | "setRequestHeader"> & {
  upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null }
  onload: (() => void) | null
  onerror: (() => void) | null
  ontimeout: (() => void) | null
  onabort: (() => void) | null
  status: number
  responseText: string
  timeout: number
}

/**
 * Sends one document with real progress (fetch cannot report upload progress). Resolves with the same result shape
 * as the server actions; never rejects. `makeXhr` exists for tests.
 */
export function uploadKnowledgeFile(
  agentId: string,
  file: File,
  onProgress?: (percent: number) => void,
  makeXhr: () => XhrLike = () => new XMLHttpRequest() as unknown as XhrLike
): Promise<AgentActionResult<KnowledgeDocument>> {
  return new Promise((resolve) => {
    const xhr = makeXhr()
    const body = new FormData()
    body.append("file", file, file.name)
    xhr.open("POST", uploadUrl(agentId))
    xhr.timeout = 120_000
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.((event.loaded / event.total) * 100)
    }
    xhr.onload = () => {
      let payload: unknown = null
      try {
        payload = JSON.parse(xhr.responseText)
      } catch {
        payload = null
      }
      const parsed = payload as Partial<AgentActionResult<KnowledgeDocument>> | null
      if (xhr.status >= 200 && xhr.status < 300 && parsed && parsed.success === true && "data" in parsed) {
        resolve({ success: true, data: parsed.data as KnowledgeDocument })
        return
      }
      const error = parsed && parsed.success === false ? parsed : null
      resolve({ success: false, status: xhr.status, code: error?.code, message: error?.message, details: error?.details })
    }
    xhr.onerror = () => resolve({ success: false, status: 0, message: "network" })
    xhr.ontimeout = () => resolve({ success: false, status: 0, message: "timeout" })
    xhr.onabort = () => resolve({ success: false, status: 0, message: "aborted" })
    xhr.send(body)
  })
}
