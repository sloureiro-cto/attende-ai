import { IDocumentFolder } from "context/DocumentFolderContext"

export interface FolderNode extends Omit<IDocumentFolder, "children"> {
  /** Nested subfolders in the sidebar tree (from flat list or lazy load). */
  children?: FolderNode[]
  documents?: IDocumentFolder[]
  isLoading?: boolean
  /** Next page of children to fetch in the sidebar; undefined when everything is loaded. */
  nextChildrenPage?: number
}

/**
 * Builds a tree of FolderNode from a flat list of folders.
 * Handles both API responses that return only root folders and those that return a flat list with parentIds.
 * Strips API `children` so it is not confused with the tree `children` field.
 */
export function buildFolderTreeFromList(folders: IDocumentFolder[]): FolderNode[] {
  if (folders.length === 0) return []

  const folderMap = new Map<string, FolderNode>()
  const rootFolders: FolderNode[] = []

  folders.forEach((folder) => {
    const { children: _apiChildren, ...folderFields } = folder
    folderMap.set(folder._id.toString(), {
      ...folderFields,
      children: [],
      documents: undefined,
    })
  })

  folders.forEach((folder) => {
    const node = folderMap.get(folder._id.toString())!
    const parentId = folder.parentId?.toString?.()
    if (!parentId || parentId === "") {
      rootFolders.push(node)
    } else {
      const parent = folderMap.get(parentId)
      if (parent) {
        if (!parent.children) parent.children = []
        parent.children.push(node)
      } else {
        rootFolders.push(node)
      }
    }
  })

  const sortByOrder = (nodes: FolderNode[]) => {
    nodes.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    nodes.forEach((f) => f.children?.length && sortByOrder(f.children))
  }
  sortByOrder(rootFolders)
  return rootFolders
}
