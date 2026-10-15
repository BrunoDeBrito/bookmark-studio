import { bookmarksApi } from './bookmarksApi'
import type { BookmarkNode } from '../types'

// Tracking params that don't change which page a URL points to.
const TRACKING_PARAMS = /^(ref|via|source|aff|fbclid|gclid|_hsmi|pscd|utm_.*)$/i

/** Canonical form of a URL, used to spot duplicates that differ only in tracking noise. */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    const params = [...u.searchParams].filter(([k]) => !TRACKING_PARAMS.test(k))
    const query = params.length ? '?' + new URLSearchParams(params).toString() : ''
    const host = u.hostname.toLowerCase().replace(/^www\./, '')
    const path = u.pathname.replace(/\/+$/, '')
    return `${host}${u.port ? ':' + u.port : ''}${path}${query}${u.hash}`
  } catch {
    return url.trim().toLowerCase()
  }
}

export interface LinkItem {
  id: string
  title: string
  url: string
  /** Folder path relative to the organized folder, e.g. "Frameworks/PHP". Empty for direct children. */
  path: string
}

export function collectLinks(folder: BookmarkNode): LinkItem[] {
  const out: LinkItem[] = []
  function walk(node: BookmarkNode, path: string) {
    for (const child of node.children ?? []) {
      if (child.url) out.push({ id: child.id, title: child.title, url: child.url, path })
      else walk(child, path ? `${path}/${child.title}` : child.title)
    }
  }
  walk(folder, '')
  return out
}

/** Splits links into the copy to keep for each URL and the redundant copies to delete. */
export function findDuplicates(links: LinkItem[]): { unique: LinkItem[]; duplicates: LinkItem[] } {
  const byKey = new Map<string, LinkItem>()
  const duplicates: LinkItem[] = []
  for (const link of links) {
    const key = normalizeUrl(link.url)
    const kept = byKey.get(key)
    if (!kept) {
      byKey.set(key, link)
    } else if (hasTracking(kept.url) && !hasTracking(link.url)) {
      // Prefer the clean URL as the surviving copy.
      byKey.set(key, link)
      duplicates.push(kept)
    } else {
      duplicates.push(link)
    }
  }
  return { unique: [...byKey.values()], duplicates }
}

function hasTracking(url: string): boolean {
  try {
    return [...new URL(url).searchParams.keys()].some((k) => TRACKING_PARAMS.test(k))
  } catch {
    return false
  }
}

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

function sortKey(node: BookmarkNode): string {
  return node.title || node.url || ''
}

/** Folders first, then links, each group alphabetical ignoring case and accents. */
export function sortedChildren(children: BookmarkNode[]): BookmarkNode[] {
  const folders = children.filter((c) => !c.url).sort((a, b) => collator.compare(sortKey(a), sortKey(b)))
  const links = children.filter((c) => !!c.url).sort((a, b) => collator.compare(sortKey(a), sortKey(b)))
  return [...folders, ...links]
}

export type Progress = (message: string) => void

/** Reorders a folder (and optionally every subfolder) alphabetically, folders first. */
export async function sortAlphabetically(folderId: string, recursive: boolean, onProgress?: Progress) {
  const tree = await bookmarksApi.getTree()
  const root = findNode(tree, folderId)
  if (!root) throw new Error('Pasta não encontrada')

  async function sortNode(node: BookmarkNode) {
    onProgress?.(`Ordenando "${node.title || 'pasta'}"...`)
    const target = sortedChildren(node.children ?? [])
    // Moving each item into slot i in ascending order only ever moves items to a lower
    // index, which sidesteps Chrome's off-by-one when moving forward within a parent.
    const current = (node.children ?? []).map((c) => c.id)
    for (let i = 0; i < target.length; i++) {
      if (current[i] === target[i].id) continue
      await bookmarksApi.move(target[i].id, { parentId: node.id, index: i })
      const from = current.indexOf(target[i].id)
      current.splice(from, 1)
      current.splice(i, 0, target[i].id)
    }
    if (recursive) {
      for (const child of node.children ?? []) if (!child.url) await sortNode(child)
    }
  }

  await sortNode(root)
}

export interface OrganizePlan {
  /** Bookmark id -> destination folder path relative to the organized folder ("" = the folder itself). */
  assignments: Map<string, string>
  duplicates: LinkItem[]
}

/**
 * Applies an AI plan to the folder: creates the destination folders, moves every link,
 * deletes duplicates and the folders left empty, then sorts everything alphabetically.
 */
export async function applyPlan(folderId: string, plan: OrganizePlan, onProgress?: Progress) {
  const tree = await bookmarksApi.getTree()
  const root = findNode(tree, folderId)
  if (!root) throw new Error('Pasta não encontrada')

  const folderIds = new Map<string, string>([['', folderId]])
  const existing = new Map<string, BookmarkNode[]>()
  existing.set(folderId, (root.children ?? []).filter((c) => !c.url))

  async function ensureFolder(path: string): Promise<string> {
    const known = folderIds.get(path)
    if (known) return known
    const slash = path.lastIndexOf('/')
    const parentPath = slash === -1 ? '' : path.slice(0, slash)
    const name = slash === -1 ? path : path.slice(slash + 1)
    const parentId = await ensureFolder(parentPath)
    const siblings = existing.get(parentId) ?? []
    let folder = siblings.find((s) => collator.compare(s.title, name) === 0)
    if (!folder) {
      folder = await bookmarksApi.create({ parentId, title: name })
      siblings.push(folder)
      existing.set(parentId, siblings)
    } else if (!existing.has(folder.id)) {
      existing.set(folder.id, (folder.children ?? []).filter((c) => !c.url))
    }
    folderIds.set(path, folder.id)
    return folder.id
  }

  const total = plan.assignments.size
  let done = 0
  for (const [id, path] of plan.assignments) {
    const parentId = await ensureFolder(path)
    await bookmarksApi.move(id, { parentId })
    done++
    if (done % 25 === 0 || done === total) onProgress?.(`Movendo links... ${done}/${total}`)
  }

  onProgress?.(`Removendo ${plan.duplicates.length} duplicados...`)
  for (const dup of plan.duplicates) await bookmarksApi.remove(dup.id)

  onProgress?.('Removendo pastas vazias...')
  await removeEmptyFolders(folderId)

  await sortAlphabetically(folderId, true, onProgress)
}

async function removeEmptyFolders(folderId: string) {
  const tree = await bookmarksApi.getTree()
  const root = findNode(tree, folderId)
  if (!root) return
  async function prune(node: BookmarkNode): Promise<boolean> {
    let empty = true
    for (const child of node.children ?? []) {
      if (child.url) empty = false
      else if (await prune(child)) await bookmarksApi.remove(child.id)
      else empty = false
    }
    return empty
  }
  await prune(root)
}

/** Downloads the folder's subtree as JSON so the user can recover from a bad reorganization. */
export function downloadBackup(folder: BookmarkNode) {
  const blob = new Blob([JSON.stringify(folder, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  a.href = URL.createObjectURL(blob)
  a.download = `backup-${(folder.title || 'bookmarks').replace(/[^\w-]+/g, '_')}-${stamp}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

function findNode(tree: BookmarkNode[], id: string): BookmarkNode | undefined {
  for (const node of tree) {
    if (node.id === id) return node
    const found = node.children && findNode(node.children, id)
    if (found) return found
  }
  return undefined
}
