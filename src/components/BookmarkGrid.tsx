import { SortableContext, rectSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Bookmark } from 'lucide-react'
import clsx from 'clsx'
import { BookmarkCard } from './BookmarkCard'
import type { BookmarkNode } from '../types'

export function BookmarkGrid({
  bookmarks,
  viewMode,
  onEdit,
  onDelete,
  emptyHint,
}: {
  bookmarks: BookmarkNode[]
  viewMode: 'grid' | 'list'
  onEdit: (node: BookmarkNode) => void
  onDelete: (node: BookmarkNode) => void
  emptyHint?: string
}) {
  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-24 text-center text-slate-400">
        <Bookmark size={28} className="mb-1 opacity-50" />
        <p className="text-sm font-medium">Nenhum bookmark aqui</p>
        {emptyHint && <p className="max-w-xs text-xs text-slate-400">{emptyHint}</p>}
      </div>
    )
  }

  return (
    <div className="p-6">
      <SortableContext items={bookmarks.map((b) => b.id)} strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
        <div
          className={clsx(
            viewMode === 'grid'
              ? 'grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3'
              : 'flex flex-col gap-1',
          )}
        >
          {bookmarks.map((node) => (
            <BookmarkCard key={node.id} node={node} viewMode={viewMode} onEdit={() => onEdit(node)} onDelete={() => onDelete(node)} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
