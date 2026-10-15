import { Bookmark } from 'lucide-react'
import { FolderTreeItem } from './FolderTreeItem'
import type { BookmarkNode } from '../types'

export function Sidebar({
  roots,
  selectedId,
  expanded,
  onSelect,
  onToggle,
  countFor,
  bookmarkCount,
}: {
  roots: BookmarkNode[]
  selectedId: string | null
  expanded: Record<string, boolean>
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  countFor: (id: string) => number
  bookmarkCount: number
}) {
  const topFolders = roots.flatMap((r) => (r.children ?? []).filter((c: BookmarkNode) => !c.url))

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200/70 bg-white/60 backdrop-blur-xl dark:border-white/5 dark:bg-white/[0.02]">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25">
          <Bookmark size={16} fill="currentColor" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">Bookmark Studio</p>
          <p className="mt-1 text-[11px] text-slate-400">{bookmarkCount} bookmarks</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {topFolders.map((node) => (
          <FolderTreeItem
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            expanded={expanded}
            onSelect={onSelect}
            onToggle={onToggle}
            countFor={countFor}
          />
        ))}
      </nav>
    </aside>
  )
}
