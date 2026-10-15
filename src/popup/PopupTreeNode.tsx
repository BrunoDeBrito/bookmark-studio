import { useState } from 'react'
import { ChevronRight, Folder, FolderOpen } from 'lucide-react'
import clsx from 'clsx'
import { faviconUrl } from '../lib/favicon'
import type { BookmarkNode } from '../types'

export function PopupTreeNode({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: BookmarkNode
  depth: number
  expanded: Record<string, boolean>
  onToggle: (id: string) => void
}) {
  const isFolder = !node.url
  const isOpen = !!expanded[node.id]
  const paddingLeft = 8 + depth * 16

  if (!isFolder) {
    return (
      <a
        href={node.url}
        target="_blank"
        rel="noreferrer"
        style={{ paddingLeft: paddingLeft + 20 }}
        className="flex items-center gap-2 rounded-lg py-1.5 pr-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
      >
        <PopupFavicon url={node.url} />
        <span className="truncate">{node.title || node.url}</span>
      </a>
    )
  }

  const children = node.children ?? []
  const hasChildren = children.length > 0

  return (
    <div>
      <div
        style={{ paddingLeft }}
        className="flex cursor-pointer items-center gap-1 rounded-lg py-1.5 pr-2 text-sm text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
        onClick={() => hasChildren && onToggle(node.id)}
      >
        <span
          className={clsx(
            'flex h-4 w-4 shrink-0 items-center justify-center text-slate-400 transition-transform',
            hasChildren ? 'visible' : 'invisible',
            isOpen && 'rotate-90',
          )}
        >
          <ChevronRight size={13} />
        </span>
        {isOpen ? (
          <FolderOpen size={15} className="shrink-0 text-indigo-400" />
        ) : (
          <Folder size={15} className="shrink-0 text-slate-400" />
        )}
        <span className="truncate font-medium">{node.title || 'Sem nome'}</span>
      </div>
      {isOpen && hasChildren && (
        <div>
          {children.map((child) => (
            <PopupTreeNode key={child.id} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  )
}

function PopupFavicon({ url }: { url?: string }) {
  const [ok, setOk] = useState(true)
  if (!url || !ok) {
    return (
      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-gradient-to-br from-slate-200 to-slate-100 text-[9px] font-semibold text-slate-400 dark:from-white/10 dark:to-white/5">
        {url ? hostnameOf(url).slice(0, 1).toUpperCase() : '?'}
      </div>
    )
  }
  return <img src={faviconUrl(url, 16)} onError={() => setOk(false)} width={16} height={16} className="shrink-0 rounded" alt="" />
}

function hostnameOf(url?: string) {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
