import type { BookmarkNode } from '../types'
import { ext } from './ext'

const hasChromeBookmarks = !!ext?.bookmarks?.getTree

const MOCK_KEY = 'bookmark-studio-mock-tree-v1'

type MockNodeInput = Omit<BookmarkNode, 'syncing'> & { children?: BookmarkNode[] }

function mk(node: MockNodeInput): BookmarkNode {
  return { syncing: false, ...node }
}

function seedMockTree(): BookmarkNode[] {
  const now = Date.now()
  let nextId = 1
  const id = () => String(nextId++)
  const bar = mk({
    id: id(),
    parentId: '0',
    index: 0,
    title: 'Barra de favoritos',
    dateAdded: now,
    children: [
      mk({
        id: id(),
        parentId: '1',
        index: 0,
        title: 'Desenvolvimento',
        dateAdded: now,
        children: [
          mk({ id: id(), parentId: '2', index: 0, title: 'Laravel', url: 'https://laravel.com/', dateAdded: now }),
          mk({ id: id(), parentId: '2', index: 1, title: 'React', url: 'https://react.dev/', dateAdded: now }),
          mk({ id: id(), parentId: '2', index: 2, title: 'Tailwind CSS', url: 'https://tailwindcss.com/', dateAdded: now }),
        ],
      }),
      mk({
        id: id(),
        parentId: '1',
        index: 1,
        title: 'Design',
        dateAdded: now,
        children: [
          mk({ id: id(), parentId: '6', index: 0, title: 'Figma', url: 'https://figma.com/', dateAdded: now }),
          mk({ id: id(), parentId: '6', index: 1, title: 'Dribbble', url: 'https://dribbble.com/', dateAdded: now }),
        ],
      }),
      mk({ id: id(), parentId: '1', index: 2, title: 'GitHub', url: 'https://github.com/', dateAdded: now }),
    ],
  })
  const other = mk({
    id: id(),
    parentId: '0',
    index: 1,
    title: 'Outros favoritos',
    dateAdded: now,
    children: [],
  })
  return [mk({ id: '0', title: 'root', index: 0, children: [bar, other] })]
}

function loadMockTree(): BookmarkNode[] {
  try {
    const raw = localStorage.getItem(MOCK_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  const seeded = seedMockTree()
  saveMockTree(seeded)
  return seeded
}

function saveMockTree(tree: BookmarkNode[]) {
  localStorage.setItem(MOCK_KEY, JSON.stringify(tree))
}

function findNode(tree: BookmarkNode[], id: string): BookmarkNode | undefined {
  for (const node of tree) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return undefined
}

function findParentArray(tree: BookmarkNode[], id: string): BookmarkNode[] | undefined {
  for (const node of tree) {
    if (node.children) {
      if (node.children.some((c) => c.id === id)) return node.children
      const found = findParentArray(node.children, id)
      if (found) return found
    }
  }
  return undefined
}

function reindex(nodes: BookmarkNode[]) {
  nodes.forEach((c, i) => (c.index = i))
}

let mockIdCounter = 10000
const nextMockId = () => String(mockIdCounter++)

export const bookmarksApi = {
  isLive: hasChromeBookmarks,

  async getTree(): Promise<BookmarkNode[]> {
    if (hasChromeBookmarks) return ext!.bookmarks.getTree()
    return loadMockTree()
  },

  async create(params: { parentId: string; title: string; url?: string; index?: number }): Promise<BookmarkNode> {
    if (hasChromeBookmarks) return ext!.bookmarks.create(params)
    const tree = loadMockTree()
    const parent = findNode(tree, params.parentId)
    if (!parent) throw new Error('Pasta não encontrada')
    if (!parent.children) parent.children = []
    const index = params.index ?? parent.children.length
    const node = mk({
      id: nextMockId(),
      parentId: params.parentId,
      index,
      title: params.title,
      url: params.url,
      dateAdded: Date.now(),
      children: params.url ? undefined : [],
    })
    parent.children.splice(index, 0, node)
    reindex(parent.children)
    saveMockTree(tree)
    return node
  },

  async update(id: string, changes: { title?: string; url?: string }): Promise<BookmarkNode> {
    if (hasChromeBookmarks) return ext!.bookmarks.update(id, changes)
    const tree = loadMockTree()
    const node = findNode(tree, id)
    if (!node) throw new Error('Item não encontrado')
    if (changes.title !== undefined) node.title = changes.title
    if (changes.url !== undefined) node.url = changes.url
    saveMockTree(tree)
    return node
  },

  async move(id: string, destination: { parentId?: string; index?: number }): Promise<BookmarkNode> {
    if (hasChromeBookmarks) return ext!.bookmarks.move(id, destination)
    const tree = loadMockTree()
    const node = findNode(tree, id)
    if (!node) throw new Error('Item não encontrado')
    const oldParentArr = findParentArray(tree, id)
    if (oldParentArr) {
      const idx = oldParentArr.findIndex((c) => c.id === id)
      if (idx >= 0) oldParentArr.splice(idx, 1)
      reindex(oldParentArr)
    }
    const newParentId = destination.parentId ?? node.parentId!
    const newParent = findNode(tree, newParentId)
    if (!newParent) throw new Error('Pasta destino não encontrada')
    if (!newParent.children) newParent.children = []
    const insertAt = destination.index ?? newParent.children.length
    node.parentId = newParentId
    newParent.children.splice(insertAt, 0, node)
    reindex(newParent.children)
    saveMockTree(tree)
    return node
  },

  async remove(id: string): Promise<void> {
    if (hasChromeBookmarks) return ext!.bookmarks.remove(id)
    const tree = loadMockTree()
    const arr = findParentArray(tree, id)
    if (arr) {
      const idx = arr.findIndex((c) => c.id === id)
      if (idx >= 0) arr.splice(idx, 1)
      reindex(arr)
    }
    saveMockTree(tree)
  },

  async removeTree(id: string): Promise<void> {
    if (hasChromeBookmarks) return ext!.bookmarks.removeTree(id)
    return this.remove(id)
  },
}
