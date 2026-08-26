import { create } from 'zustand'
import { bookmarksApi } from '../lib/bookmarksApi'
import type { BookmarkNode, FlatFolder } from '../types'

interface BookmarkState {
  roots: BookmarkNode[]
  loading: boolean
  selectedFolderId: string | null
  searchQuery: string
  viewMode: 'grid' | 'list'
  expanded: Record<string, boolean>

  load: () => Promise<void>
  refresh: () => Promise<void>
  selectFolder: (id: string) => void
  toggleExpanded: (id: string) => void
  setSearchQuery: (q: string) => void
  setViewMode: (mode: 'grid' | 'list') => void

  createBookmark: (parentId: string, title: string, url: string) => Promise<void>
  createFolder: (parentId: string, title: string) => Promise<void>
  updateBookmark: (id: string, title: string, url?: string) => Promise<void>
  moveNode: (id: string, parentId: string, index?: number) => Promise<void>
  deleteNode: (id: string) => Promise<void>
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  roots: [],
  loading: true,
  selectedFolderId: null,
  searchQuery: '',
  viewMode: 'grid',
  expanded: {},

  load: async () => {
    set({ loading: true })
    const roots = await bookmarksApi.getTree()
    const barFolder = findFirstFolderWithChildren(roots)
    set({
      roots,
      loading: false,
      selectedFolderId: get().selectedFolderId ?? barFolder?.id ?? null,
      expanded: barFolder ? { [barFolder.id]: true, [roots[0]?.id ?? '0']: true } : get().expanded,
    })
  },

  refresh: async () => {
    const roots = await bookmarksApi.getTree()
    set({ roots })
  },

  selectFolder: (id) => set({ selectedFolderId: id, searchQuery: '' }),
  toggleExpanded: (id) =>
    set((s) => ({ expanded: { ...s.expanded, [id]: !s.expanded[id] } })),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setViewMode: (viewMode) => set({ viewMode }),

  createBookmark: async (parentId, title, url) => {
    await bookmarksApi.create({ parentId, title, url })
    await get().refresh()
  },
  createFolder: async (parentId, title) => {
    await bookmarksApi.create({ parentId, title })
    set((s) => ({ expanded: { ...s.expanded, [parentId]: true } }))
    await get().refresh()
  },
  updateBookmark: async (id, title, url) => {
    await bookmarksApi.update(id, { title, url })
    await get().refresh()
  },
  moveNode: async (id, parentId, index) => {
    await bookmarksApi.move(id, { parentId, index })
    await get().refresh()
  },
  deleteNode: async (id) => {
    await bookmarksApi.removeTree(id)
    await get().refresh()
  },
}))

function findFirstFolderWithChildren(roots: BookmarkNode[]): BookmarkNode | undefined {
  for (const root of roots) {
    if (root.children) {
      for (const child of root.children) {
        if (!child.url) return child
      }
    }
  }
  return roots[0]?.children?.[0]
}

export function findNodeById(roots: BookmarkNode[], id: string): BookmarkNode | undefined {
  for (const node of roots) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return undefined
}

export function flattenFolders(roots: BookmarkNode[]): FlatFolder[] {
  const out: FlatFolder[] = []
  function walk(nodes: BookmarkNode[], depth: number, parentId?: string) {
    for (const node of nodes) {
      if (node.url) continue
      out.push({ id: node.id, title: node.title || 'Sem nome', parentId, depth })
      if (node.children) walk(node.children, depth + 1, node.id)
    }
  }
  walk(roots, 0)
  return out
}

export function isDescendant(roots: BookmarkNode[], ancestorId: string, nodeId: string): boolean {
  const node = findNodeById(roots, ancestorId)
  if (!node?.children) return false
  for (const child of node.children) {
    if (child.id === nodeId) return true
    if (isDescendant([child], child.id, nodeId)) return true
  }
  return false
}

export function searchBookmarks(roots: BookmarkNode[], query: string): BookmarkNode[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const out: BookmarkNode[] = []
  function walk(nodes: BookmarkNode[]) {
    for (const node of nodes) {
      if (node.url) {
        if (node.title.toLowerCase().includes(q) || node.url.toLowerCase().includes(q)) {
          out.push(node)
        }
      } else if (node.children) {
        walk(node.children)
      }
    }
  }
  walk(roots)
  return out
}
