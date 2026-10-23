import type { FolderNode } from "actions/documents/buildFolderTree"
import type { IDocumentFolder } from "context/DocumentFolderContext"

export interface SidebarLibraryState {
  folderTree: FolderNode[]
  rootDocuments: IDocumentFolder[]
}

const toId = (value: IDocumentFolder["_id"] | null | undefined): string | null => {
  if (value == null) return null
  return value.toString()
}

const mapTree = (nodes: FolderNode[], fn: (node: FolderNode) => FolderNode): FolderNode[] =>
  nodes.map((node) => {
    const updated = fn(node)
    if (updated.children?.length) {
      return { ...updated, children: mapTree(updated.children, fn) }
    }
    return updated
  })

export function renameInSidebarTree(state: SidebarLibraryState, id: string, name: string): SidebarLibraryState {
  const renameNode = (node: FolderNode): FolderNode => {
    if (toId(node._id) === id) return { ...node, name }
    if (node.documents) {
      return {
        ...node,
        documents: node.documents.map((doc) => (toId(doc._id) === id ? { ...doc, name } : doc)),
      }
    }
    return node
  }

  return {
    folderTree: mapTree(state.folderTree, renameNode),
    rootDocuments: state.rootDocuments.map((doc) => (toId(doc._id) === id ? { ...doc, name } : doc)),
  }
}

export function removeFromSidebarTree(state: SidebarLibraryState, id: string): SidebarLibraryState {
  const filterTree = (nodes: FolderNode[]): FolderNode[] =>
    nodes
      .filter((node) => toId(node._id) !== id)
      .map((node) => ({
        ...node,
        children: node.children ? filterTree(node.children) : node.children,
        documents: node.documents?.filter((doc) => toId(doc._id) !== id),
      }))

  return {
    folderTree: filterTree(state.folderTree),
    rootDocuments: state.rootDocuments.filter((doc) => toId(doc._id) !== id),
  }
}

function folderToNode(folder: IDocumentFolder): FolderNode {
  const { children: _apiChildren, ...fields } = folder
  return { ...fields, children: [], documents: undefined }
}

function addToParentTree(nodes: FolderNode[], parentId: string, item: IDocumentFolder): FolderNode[] {
  return nodes.map((node) => {
    if (toId(node._id) === parentId) {
      if (item.type === "folder") {
        const childExists = node.children?.some((c) => toId(c._id) === toId(item._id))
        if (childExists) return node
        return { ...node, children: [...(node.children ?? []), folderToNode(item)] }
      }
      if (node.documents !== undefined) {
        const docExists = node.documents.some((d) => toId(d._id) === toId(item._id))
        if (docExists) return node
        return { ...node, documents: [...node.documents, item] }
      }
      return node
    }
    if (node.children?.length) {
      return { ...node, children: addToParentTree(node.children, parentId, item) }
    }
    return node
  })
}

export function addToSidebarTree(
  state: SidebarLibraryState,
  item: IDocumentFolder,
  parentId?: string | null
): SidebarLibraryState {
  const normalizedParentId = parentId?.toString() || null

  if (!normalizedParentId) {
    if (item.type === "folder") {
      const exists = state.folderTree.some((f) => toId(f._id) === toId(item._id))
      if (exists) return state
      return { ...state, folderTree: [...state.folderTree, folderToNode(item)] }
    }
    const exists = state.rootDocuments.some((d) => toId(d._id) === toId(item._id))
    if (exists) return state
    return { ...state, rootDocuments: [...state.rootDocuments, item] }
  }

  return {
    ...state,
    folderTree: addToParentTree(state.folderTree, normalizedParentId, item),
  }
}

export function moveInSidebarTree(
  state: SidebarLibraryState,
  item: IDocumentFolder,
  newParentId?: string | null
): SidebarLibraryState {
  const id = toId(item._id)!
  const without = removeFromSidebarTree(state, id)
  return addToSidebarTree(without, { ...item, parentId: newParentId ?? null }, newParentId)
}
