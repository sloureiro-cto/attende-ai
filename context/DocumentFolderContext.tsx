"use client"

import { ObjectId } from "mongoose"
import { createContext, Dispatch, ReactNode, SetStateAction, useCallback, useContext, useState } from "react"
import { AccessControlList } from "app/_types/IAccessEntry"
import { IUser } from "app/_types/User"
import type { SidebarLibraryState } from "lib/documents/patchSidebarTree"

export type DocumentFolderType = "folder" | "document" | "file"
export type DocumentFolderAccessScope = "workspace" | "private" | "public"

export interface IDocumentFolder {
  _id: ObjectId | string
  name: string
  type: DocumentFolderType
  parentId?: ObjectId | null | undefined | string
  owner: ObjectId | IUser | string
  content?: string
  order: number
  createdAt: Date
  updatedAt: Date
  workspaceOwner?: ObjectId | IUser | string
  attachments?: ObjectId[]
  isArchived?: boolean
  status: "draft" | "published"
  accessScope: DocumentFolderAccessScope
  accessEntries: AccessControlList[]
  isDeleted?: boolean
  deletedAt?: Date
  deletedBy?: ObjectId | IUser | string
  isDraft?: boolean
  /** Root Library group folders only (Projects / Meetings). */
  isSystem?: boolean
  /** e.g. `library_group:projects` | `library_group:meetings` for system roots. */
  source?: string
  /** Latest snapshot version number for rich-text documents (0 when none). */
  currentSnapshotVersion?: number
  /** When the last snapshot was created (server-managed). */
  lastSnapshotAt?: string
  // File upload fields
  fileName?: string
  fileUrl?: string
  fileSize?: number
  mimeType?: string
  /** When the API returns nested items (e.g. populated refs). Not used on `FolderNode` — see `buildFolderTree`. */
  children?: IDocumentFolder[]
}

export interface IDocumentFolderContextType {
  folders: IDocumentFolder[]
  setFolders: Dispatch<SetStateAction<IDocumentFolder[]>>
  documents: IDocumentFolder[]
  setDocuments: Dispatch<SetStateAction<IDocumentFolder[]>>
  foldersLoading: boolean
  setFoldersLoading: Dispatch<SetStateAction<boolean>>
  documentsLoading: boolean
  setDocumentsLoading: Dispatch<SetStateAction<boolean>>
  documentsPaginationLoading: boolean
  setDocumentsPaginationLoading: Dispatch<SetStateAction<boolean>>
  selectedDocument: IDocumentFolder | null
  setSelectedDocument: Dispatch<SetStateAction<IDocumentFolder | null>>
  selectedDocumentLoading: boolean
  setSelectedDocumentLoading: Dispatch<SetStateAction<boolean>>
  sidebarLibrary: SidebarLibraryState
  setSidebarLibrary: Dispatch<SetStateAction<SidebarLibraryState>>
  patchSidebarLibrary: (patch: (prev: SidebarLibraryState) => SidebarLibraryState) => void
}

const DocumentFolderContext = createContext<IDocumentFolderContextType | undefined>(undefined)

export const useDocumentFolder = (): IDocumentFolderContextType => {
  const context = useContext(DocumentFolderContext)
  if (!context) {
    throw new Error("useDocumentFolder must be used within a DocumentFolderProvider")
  }
  return context
}

const DocumentFolderProvider = ({ children }: { children: ReactNode }) => {
  const [folders, setFolders] = useState<IDocumentFolder[]>([])
  const [foldersLoading, setFoldersLoading] = useState(false)
  const [documents, setDocuments] = useState<IDocumentFolder[]>([])
  const [selectedDocument, setSelectedDocument] = useState<IDocumentFolder | null>(null)
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [documentsPaginationLoading, setDocumentsPaginationLoading] = useState(false)
  const [selectedDocumentLoading, setSelectedDocumentLoading] = useState(false)
  const [sidebarLibrary, setSidebarLibrary] = useState<SidebarLibraryState>({
    folderTree: [],
    rootDocuments: [],
  })
  const patchSidebarLibrary = useCallback((patch: (prev: SidebarLibraryState) => SidebarLibraryState) => {
    setSidebarLibrary(patch)
  }, [])

  return (
    <DocumentFolderContext.Provider
      value={{
        folders,
        setFolders,
        documents,
        setDocuments,
        foldersLoading,
        setFoldersLoading,
        documentsLoading,
        setDocumentsLoading,
        documentsPaginationLoading,
        setDocumentsPaginationLoading,
        selectedDocument,
        setSelectedDocument,
        selectedDocumentLoading,
        setSelectedDocumentLoading,
        sidebarLibrary,
        setSidebarLibrary,
        patchSidebarLibrary,
      }}
    >
      {children}
    </DocumentFolderContext.Provider>
  )
}

export default DocumentFolderProvider
