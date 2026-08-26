import { useDroppable } from '@dnd-kit/core'
import { ChevronRight, Folder, FolderOpen } from 'lucide-react'
import clsx from 'clsx'
import type { BookmarkNode } from '../types'

export function FolderTreeItem({
  node,
  depth,
  selectedId,
  expanded,
  onSelect,
  onToggle,
  countFor,
}: {
  node: BookmarkNode
  depth: number
  selectedId: string | null
  expanded: Record<string, boolean>
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  countFor: (id: string) => number
}) {
  const childFolders = (node.children ?? []).filter((c: BookmarkNode) => !c.url)
  const hasChildren = childFolders.length > 0
  const isOpen = !!expanded[node.id]
  const isSelected = selectedId === node.id
  const { setNodeRef, isOver } = useDroppable({ id: `folder:${node.id}` })

  return (
    <div>
      <div
        ref={setNodeRef}
        style={{ paddingLeft: 10 + depth * 16 }}
        className={clsx(
          'group flex cursor-pointer items-center gap-1 rounded-lg py-1.5 pr-2 text-sm transition-colors',
          isSelected
            ? 'bg-gradient-to-r from-indigo-500/15 to-purple-500/10 font-medium text-indigo-700 dark:text-indigo-300'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5',
          isOver && 'ring-2 ring-indigo-400/70 bg-indigo-50 dark:bg-indigo-500/10',
        )}
        onClick={() => onSelect(node.id)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle(node.id)
          }}
          className={clsx(
            'flex h-4 w-4 shrink-0 items-center justify-center text-slate-400 transition-transform',
            hasChildren ? 'visible' : 'invisible',
            isOpen && 'rotate-90',
          )}
        >
          <ChevronRight size={13} />
        </button>
        {isOpen ? (
          <FolderOpen size={15} className="shrink-0 text-indigo-400" />
        ) : (
          <Folder size={15} className="shrink-0 text-slate-400" />
        )}
        <span className="truncate">{node.title || 'Sem nome'}</span>
        <span className="ml-auto shrink-0 text-[11px] text-slate-400 opacity-0 group-hover:opacity-100">
          {countFor(node.id) || ''}
        </span>
      </div>
      {isOpen && hasChildren && (
        <div>
          {childFolders.map((child) => (
            <FolderTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              onSelect={onSelect}
              onToggle={onToggle}
              countFor={countFor}
            />
          ))}
        </div>
      )}
    </div>
  )
}
