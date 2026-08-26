import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Folder, GripVertical, Pencil, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import type { BookmarkNode } from '../types'

export function FolderCard({
  node,
  viewMode,
  onOpen,
  onEdit,
  onDelete,
}: {
  node: BookmarkNode
  viewMode: 'grid' | 'list'
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `folder:${node.id}` })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const itemCount = (node.children ?? []).length

  if (viewMode === 'list') {
    return (
      <div
        ref={(el) => {
          setNodeRef(el)
          setDropRef(el)
        }}
        style={style}
        onClick={onOpen}
        className={clsx(
          'group flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition hover:border-slate-200 hover:bg-white hover:shadow-sm dark:hover:border-white/10 dark:hover:bg-white/[0.03]',
          isDragging && 'opacity-40',
          isOver && 'border-indigo-300 bg-indigo-50/70 dark:border-indigo-500/40 dark:bg-indigo-500/10',
        )}
      >
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab text-slate-300 active:cursor-grabbing dark:text-slate-600"
        >
          <GripVertical size={15} />
        </button>
        <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
          <Folder size={17} className="text-indigo-400" />
        </div>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-200">
          {node.title || 'Sem nome'}
        </span>
        <span className="hidden shrink-0 text-xs text-slate-400 sm:block">
          {itemCount} {itemCount === 1 ? 'item' : 'itens'}
        </span>
        <CardActions onEdit={onEdit} onDelete={onDelete} />
      </div>
    )
  }

  return (
    <div
      ref={(el) => {
        setNodeRef(el)
        setDropRef(el)
      }}
      style={style}
      onClick={onOpen}
      className={clsx(
        'group relative flex cursor-pointer flex-col rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5 dark:border-white/10 dark:bg-white/[0.03]',
        isDragging && 'opacity-40',
        isOver && 'border-indigo-300 ring-2 ring-indigo-200 dark:border-indigo-500/40 dark:ring-indigo-500/20',
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
          <Folder size={16} className="text-indigo-400" />
        </div>
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab rounded-lg p-1 text-slate-300 hover:bg-slate-100 active:cursor-grabbing dark:text-slate-600 dark:hover:bg-white/10"
          >
            <GripVertical size={14} />
          </button>
        </div>
      </div>
      <span className="mb-1 line-clamp-2 text-sm font-medium text-slate-800 dark:text-slate-200">
        {node.title || 'Sem nome'}
      </span>
      <span className="text-xs text-slate-400">
        {itemCount} {itemCount === 1 ? 'item' : 'itens'}
      </span>
      <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-3 opacity-0 transition group-hover:opacity-100 dark:border-white/5">
        <CardActions onEdit={onEdit} onDelete={onDelete} compact={false} />
      </div>
    </div>
  )
}

function CardActions({
  onEdit,
  onDelete,
  compact = true,
}: {
  onEdit: () => void
  onDelete: () => void
  compact?: boolean
}) {
  return (
    <div className={clsx('flex items-center gap-0.5', !compact && 'ml-auto')}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onEdit()
        }}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-indigo-400"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:text-slate-500 dark:hover:bg-red-500/10"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
