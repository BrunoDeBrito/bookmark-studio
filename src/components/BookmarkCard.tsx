import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ExternalLink, GripVertical, Pencil, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { faviconUrl } from '../lib/favicon'
import type { BookmarkNode } from '../types'

export function BookmarkCard({
  node,
  viewMode,
  onEdit,
  onDelete,
}: {
  node: BookmarkNode
  viewMode: 'grid' | 'list'
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id })
  const [imgOk, setImgOk] = useState(true)
  const style = { transform: CSS.Transform.toString(transform), transition }
  const hostname = safeHostname(node.url)

  if (viewMode === 'list') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={clsx(
          'group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition hover:border-slate-200 hover:bg-white hover:shadow-sm dark:hover:border-white/10 dark:hover:bg-white/[0.03]',
          isDragging && 'opacity-40',
        )}
      >
        <button {...attributes} {...listeners} className="cursor-grab text-slate-300 active:cursor-grabbing dark:text-slate-600">
          <GripVertical size={15} />
        </button>
        <Favicon url={node.url} imgOk={imgOk} setImgOk={setImgOk} size={18} />
        <a
          href={node.url}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400"
        >
          {node.title || node.url}
        </a>
        <span className="hidden shrink-0 truncate text-xs text-slate-400 sm:block sm:max-w-[220px]">{hostname}</span>
        <CardActions onEdit={onEdit} onDelete={onDelete} url={node.url} />
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group relative flex flex-col rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5 dark:border-white/10 dark:bg-white/[0.03]',
        isDragging && 'opacity-40',
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <Favicon url={node.url} imgOk={imgOk} setImgOk={setImgOk} size={28} rounded />
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab rounded-lg p-1 text-slate-300 hover:bg-slate-100 active:cursor-grabbing dark:text-slate-600 dark:hover:bg-white/10"
          >
            <GripVertical size={14} />
          </button>
        </div>
      </div>
      <a
        href={node.url}
        target="_blank"
        rel="noreferrer"
        className="mb-1 line-clamp-2 text-sm font-medium text-slate-800 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400"
      >
        {node.title || node.url}
      </a>
      <span className="truncate text-xs text-slate-400">{hostname}</span>
      <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-3 opacity-0 transition group-hover:opacity-100 dark:border-white/5">
        <CardActions onEdit={onEdit} onDelete={onDelete} url={node.url} compact={false} />
      </div>
    </div>
  )
}

function Favicon({
  url,
  imgOk,
  setImgOk,
  size,
  rounded,
}: {
  url?: string
  imgOk: boolean
  setImgOk: (v: boolean) => void
  size: number
  rounded?: boolean
}) {
  if (!url || !imgOk) {
    return (
      <div
        style={{ width: size, height: size }}
        className={clsx(
          'flex shrink-0 items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 text-[10px] font-semibold text-slate-400 dark:from-white/10 dark:to-white/5',
          rounded ? 'rounded-xl' : 'rounded-md',
        )}
      >
        {url ? safeHostname(url).slice(0, 1).toUpperCase() : '?'}
      </div>
    )
  }
  return (
    <img
      src={faviconUrl(url, size)}
      onError={() => setImgOk(false)}
      width={size}
      height={size}
      className={clsx('shrink-0', rounded ? 'rounded-xl' : 'rounded-md')}
      alt=""
    />
  )
}

function CardActions({
  onEdit,
  onDelete,
  url,
  compact = true,
}: {
  onEdit: () => void
  onDelete: () => void
  url?: string
  compact?: boolean
}) {
  return (
    <div className={clsx('flex items-center gap-0.5', !compact && 'ml-auto')}>
      {compact && url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100 dark:text-slate-600 dark:hover:bg-white/10"
        >
          <ExternalLink size={14} />
        </a>
      )}
      <button
        onClick={onEdit}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-indigo-400"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={onDelete}
        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:text-slate-500 dark:hover:bg-red-500/10"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function safeHostname(url?: string) {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
