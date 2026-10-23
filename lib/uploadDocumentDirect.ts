import { resolveBackendApiUrl } from "@/lib/resolveBackendApiUrl"
import { IDocumentFolder } from "context/DocumentFolderContext"

export interface UploadDocumentDirectOptions {
  name?: string
  parentId?: string | null
  accessScope?: "workspace" | "private" | "public"
  status?: "draft" | "published"
  order?: number
  workspaceId?: string
  meetingId?: string
  meetingRoomName?: string
  signal?: AbortSignal
  /** Agent knowledge context — uses /workspace-knowledge/documents/upload (no Library RBAC). */
  agentKnowledge?: boolean
}

export interface UploadedDocument extends IDocumentFolder {
  fileName?: string
  fileUrl?: string
  fileSize?: number
  mimeType?: string
}

interface UploadDocumentDirectResponse {
  status: boolean
  document: UploadedDocument
}

/** Vercel / Next route handler body limit (see app/api/documents/upload/route.ts). */
const NEXT_PROXY_UPLOAD_MAX_BYTES = 4 * 1024 * 1024

/** Files this large skip the API body and PUT straight to S3. */
const DIRECT_S3_MIN_BYTES = 8 * 1024 * 1024

/**
 * Sends multipart uploads to the backend documents API.
 *
 * Prefers a direct browser → API POST when `NEXT_PUBLIC_BACKEND_URL` is set (bypasses Vercel's ~4.5MB
 * function limit). Falls back to `/api/documents/upload` (Next proxy using server `BACKEND_URL`) when
 * the public URL is not configured — fine for local dev and files under 4MB.
 */
export async function uploadDocumentDirect(
  file: File,
  options: UploadDocumentDirectOptions = {}
): Promise<UploadedDocument> {
  if (!options.agentKnowledge && file.size >= DIRECT_S3_MIN_BYTES && resolveBackendApiUrl("/documents/upload-presign")) {
    try {
      return await uploadViaPresignedS3(file, options)
    } catch (error) {
      if (error instanceof Error && /not configured|Unauthorized/i.test(error.message)) {
        throw error
      }
      // Backend without /upload-presign (or a transient S3 CORS miss) still uses the API body path.
    }
  }

  const uploadPath = options.agentKnowledge ? "/workspace-knowledge/documents/upload" : "/documents/upload"
  const directUrl = resolveBackendApiUrl(uploadPath)

  if (directUrl) {
    return uploadToUrl(directUrl, file, options, true)
  }

  if (file.size > NEXT_PROXY_UPLOAD_MAX_BYTES) {
    throw new Error(
      "File is too large for proxy upload. Set NEXT_PUBLIC_BACKEND_URL to your API base (including /api) for direct uploads."
    )
  }

  const proxyPath = options.agentKnowledge ? "/api/workspace-knowledge/documents/upload" : "/api/documents/upload"
  return uploadToUrl(proxyPath, file, options, false)
}

export async function uploadDocumentsBatch(
  files: File[],
  options: UploadDocumentDirectOptions = {}
): Promise<{ documents: UploadedDocument[]; errors: Array<{ fileName: string; message: string }> }> {
  if (!files.length) {
    return { documents: [], errors: [] }
  }

  if (files.length === 1) {
    const doc = await uploadDocumentDirect(files[0]!, options)
    return { documents: [doc], errors: [] }
  }

  const uploadPath = options.agentKnowledge ? "/workspace-knowledge/documents/upload/batch" : "/documents/upload/batch"
  const directUrl = resolveBackendApiUrl(uploadPath)

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  const useDirect = Boolean(directUrl)

  if (!useDirect && totalSize > NEXT_PROXY_UPLOAD_MAX_BYTES) {
    throw new Error(
      "Files are too large for proxy upload. Set NEXT_PUBLIC_BACKEND_URL to your API base (including /api) for direct uploads."
    )
  }

  const url = useDirect
    ? directUrl!
    : options.agentKnowledge
    ? "/api/workspace-knowledge/documents/upload/batch"
    : "/api/documents/upload/batch"

  const formData = new FormData()
  const relativePaths: string[] = []
  for (const file of files) {
    formData.append("files", file)
    const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath?.trim() || file.name
    relativePaths.push(rel)
  }
  formData.append("relativePaths", JSON.stringify(relativePaths))

  if (options.parentId) formData.append("parentId", options.parentId)
  if (options.accessScope) formData.append("accessScope", options.accessScope)
  if (options.status) formData.append("status", options.status)
  if (options.workspaceId) formData.append("workspaceId", options.workspaceId)

  const headers: Record<string, string> = {}
  if (useDirect) {
    const apiToken = await getClientApiToken()
    if (!apiToken) throw new Error("Unauthorized")
    headers.Authorization = `Bearer ${apiToken}`
  }

  const response = await fetch(url, {
    method: "POST",
    body: formData,
    headers,
    signal: options.signal,
    credentials: useDirect ? "omit" : "include",
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const data = (await response.json()) as {
    documents?: UploadedDocument[]
    errors?: Array<{ fileName: string; message: string }>
  }

  const documents = (data.documents ?? []).map((doc) => {
    const id = documentIdFromUpload(doc)
    return id ? { ...doc, _id: id } : doc
  })

  return {
    documents,
    errors: data.errors ?? [],
  }
}

async function uploadToUrl(
  url: string,
  file: File,
  options: UploadDocumentDirectOptions,
  useBearerFromClientSession: boolean
): Promise<UploadedDocument> {
  const formData = buildUploadFormData(file, options)

  const headers: Record<string, string> = {}
  if (useBearerFromClientSession) {
    const apiToken = await getClientApiToken()
    if (!apiToken) {
      throw new Error("Unauthorized")
    }
    headers.Authorization = `Bearer ${apiToken}`
  }

  const response = await fetch(url, {
    method: "POST",
    body: formData,
    headers,
    signal: options.signal,
    credentials: useBearerFromClientSession ? "omit" : "include",
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const data = (await response.json()) as UploadDocumentDirectResponse
  const document = data?.document
  if (!document) {
    throw new Error("Invalid response format")
  }

  const id = documentIdFromUpload(document)
  if (!id) {
    throw new Error("Invalid response format")
  }

  return { ...document, _id: id }
}

async function uploadViaPresignedS3(
  file: File,
  options: UploadDocumentDirectOptions
): Promise<UploadedDocument> {
  const presignUrl = resolveBackendApiUrl("/documents/upload-presign")
  const registerUrl = resolveBackendApiUrl("/documents/from-url")
  if (!presignUrl || !registerUrl) {
    throw new Error("Direct S3 upload is not configured")
  }

  const apiToken = await getClientApiToken()
  if (!apiToken) throw new Error("Unauthorized")

  const headers = { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" }
  const presignResponse = await fetch(presignUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    }),
    signal: options.signal,
    credentials: "omit",
  })
  if (!presignResponse.ok) {
    throw new Error(await readErrorMessage(presignResponse))
  }

  const presign = (await presignResponse.json()) as {
    uploadUrl?: string
    publicUrl?: string
    mimeType?: string
  }
  if (!presign.uploadUrl || !presign.publicUrl) {
    throw new Error("Invalid upload presign response")
  }

  const put = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": presign.mimeType || file.type || "application/octet-stream" },
    body: file,
    signal: options.signal,
  })
  if (!put.ok) {
    throw new Error("Failed to upload file to storage")
  }

  const registerResponse = await fetch(registerUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fileUrl: presign.publicUrl,
      fileName: options.name || file.name,
      fileSize: file.size,
      mimeType: presign.mimeType || file.type,
      parentId: options.parentId ?? undefined,
      accessScope: options.accessScope,
      status: options.status,
    }),
    signal: options.signal,
    credentials: "omit",
  })
  if (!registerResponse.ok) {
    throw new Error(await readErrorMessage(registerResponse))
  }

  const data = (await registerResponse.json()) as UploadDocumentDirectResponse & { _id?: string }
  const document = data.document ?? (data._id ? ({ _id: data._id } as UploadedDocument) : null)
  if (!document) {
    throw new Error("Invalid response format")
  }
  const id = documentIdFromUpload(document)
  if (!id) {
    throw new Error("Invalid response format")
  }
  return { ...document, _id: id }
}

function buildUploadFormData(file: File, options: UploadDocumentDirectOptions): FormData {
  const formData = new FormData()
  formData.append("file", file)

  if (options.name) formData.append("name", options.name)
  if (options.parentId) formData.append("parentId", options.parentId)
  if (options.accessScope) formData.append("accessScope", options.accessScope)
  if (options.status) formData.append("status", options.status)
  if (options.order !== undefined) formData.append("order", options.order.toString())
  if (options.workspaceId) formData.append("workspaceId", options.workspaceId)
  if (options.meetingId) formData.append("meetingId", options.meetingId)
  if (options.meetingRoomName) formData.append("meetingRoomName", options.meetingRoomName)

  return formData
}

export type UploadJobStatus = {
  id: string
  status: "pending" | "processing" | "completed" | "failed"
  uploadedCount: number
  failedCount: number
  documentIds: string[]
  errors: Array<{ fileName: string; message: string }>
  errorMessage?: string
}

const UPLOAD_JOB_POLL_MS = 1500
const UPLOAD_JOB_MAX_WAIT_MS = 15 * 60 * 1000

export async function createDocumentUploadJob(
  files: File[],
  options: UploadDocumentDirectOptions = {}
): Promise<{ jobId: string }> {
  if (!files.length) throw new Error("At least one file is required")

  const uploadPath = "/documents/upload-jobs"
  const directUrl = resolveBackendApiUrl(uploadPath)
  const useDirect = Boolean(directUrl)
  const url = useDirect ? directUrl! : "/api/documents/upload-jobs"

  const formData = new FormData()
  const relativePaths: string[] = []
  for (const file of files) {
    formData.append("files", file)
    const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath?.trim() || file.name
    relativePaths.push(rel)
  }
  formData.append("relativePaths", JSON.stringify(relativePaths))
  if (options.parentId) formData.append("parentId", options.parentId)
  if (options.accessScope) formData.append("accessScope", options.accessScope)
  if (options.status) formData.append("status", options.status)

  const headers: Record<string, string> = {}
  if (useDirect) {
    const apiToken = await getClientApiToken()
    if (!apiToken) throw new Error("Unauthorized")
    headers.Authorization = `Bearer ${apiToken}`
  }

  const response = await fetch(url, {
    method: "POST",
    body: formData,
    headers,
    signal: options.signal,
    credentials: useDirect ? "omit" : "include",
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const data = (await response.json()) as { jobId?: string }
  if (!data.jobId) throw new Error("Invalid upload job response")
  return { jobId: data.jobId }
}

export async function getDocumentUploadJob(
  jobId: string,
  options: { signal?: AbortSignal } = {}
): Promise<UploadJobStatus> {
  const path = `/documents/upload-jobs/${encodeURIComponent(jobId)}`
  const directUrl = resolveBackendApiUrl(path)
  const useDirect = Boolean(directUrl)
  const url = useDirect ? directUrl! : `/api/documents/upload-jobs/${encodeURIComponent(jobId)}`

  const headers: Record<string, string> = {}
  if (useDirect) {
    const apiToken = await getClientApiToken()
    if (!apiToken) throw new Error("Unauthorized")
    headers.Authorization = `Bearer ${apiToken}`
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
    signal: options.signal,
    credentials: useDirect ? "omit" : "include",
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const data = (await response.json()) as { job?: UploadJobStatus }
  if (!data.job?.id) throw new Error("Invalid upload job status response")
  return data.job
}

/** Server-side async upload: returns when the job completes or fails. */
export async function uploadDocumentsViaJob(
  files: File[],
  options: UploadDocumentDirectOptions = {}
): Promise<{ documents: UploadedDocument[]; errors: Array<{ fileName: string; message: string }> }> {
  const large = files.filter((file) => file.size >= DIRECT_S3_MIN_BYTES)
  const small = files.filter((file) => file.size < DIRECT_S3_MIN_BYTES)
  const documents: UploadedDocument[] = []
  const errors: Array<{ fileName: string; message: string }> = []

  for (const file of large) {
    try {
      documents.push(await uploadDocumentDirect(file, options))
    } catch (error: unknown) {
      errors.push({
        fileName: file.name,
        message: error instanceof Error ? error.message : "Failed to upload file",
      })
    }
  }

  if (small.length === 0) {
    if (documents.length === 0 && errors.length > 0) {
      throw new Error(errors[0]?.message ?? "Upload failed")
    }
    return { documents, errors }
  }

  const { jobId } = await createDocumentUploadJob(small, options)
  const started = Date.now()

  while (Date.now() - started < UPLOAD_JOB_MAX_WAIT_MS) {
    if (options.signal?.aborted) {
      throw new Error("Upload cancelled")
    }
    const job = await getDocumentUploadJob(jobId, { signal: options.signal })
    if (job.status === "completed" || job.status === "failed") {
      if (job.uploadedCount === 0 && job.failedCount > 0 && documents.length === 0) {
        throw new Error(job.errors[0]?.message ?? job.errorMessage ?? "Upload failed")
      }
      return {
        documents: [
          ...documents,
          ...job.documentIds.map((id) => ({ _id: id }) as UploadedDocument),
        ],
        errors: [...errors, ...(job.errors ?? [])],
      }
    }
    await new Promise((resolve) => setTimeout(resolve, UPLOAD_JOB_POLL_MS))
  }

  throw new Error("Upload timed out while processing on the server")
}

export function documentIdFromUpload(doc: UploadedDocument): string | null {
  if (doc._id != null && String(doc._id).length > 0) {
    return String(doc._id)
  }
  const alt = (doc as { id?: string }).id
  return alt && String(alt).length > 0 ? String(alt) : null
}

async function getClientApiToken(): Promise<string | undefined> {
  try {
    const res = await fetch("/api/auth/clientsession", { credentials: "include" })
    if (!res.ok) return undefined
    const data = (await res.json()) as { apiToken?: string }
    return data?.apiToken
  } catch {
    return undefined
  }
}

/**
 * Reads an error response body without crashing on non-JSON payloads
 * (e.g. plain-text 413 from Vercel/proxy/CDN, HTML error pages).
 */
async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") || ""
  try {
    if (contentType.includes("application/json")) {
      const data = (await response.json()) as {
        error?: string | boolean
        message?: string
        errorMessage?: string
      }
      // Backend uses `{ error: true, message: "..." }` — never treat boolean `error` as the message.
      const msg = data.message || data.errorMessage
      if (typeof msg === "string" && msg.trim()) {
        return msg.trim()
      }
      if (typeof data.error === "string" && data.error.trim()) {
        return data.error.trim()
      }
      return defaultMessageForStatus(response.status)
    }
    const text = await response.text()
    if (response.status === 413 || /request entity too large|payload too large/i.test(text)) {
      return "File is too large to upload."
    }
    return text.trim() || defaultMessageForStatus(response.status)
  } catch {
    return defaultMessageForStatus(response.status)
  }
}

function defaultMessageForStatus(status: number): string {
  if (status === 401 || status === 403) return "Unauthorized"
  if (status === 413) return "File is too large to upload."
  if (status >= 500) return "Server error while uploading file"
  return "Failed to upload file"
}
