import { SortableContext, rectSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Bookmark } from 'lucide-react'
import clsx from 'clsx'
import { BookmarkCard } from './BookmarkCard'
import { FolderCard } from './FolderCard'
import type { BookmarkNode } from '../types'

export function BookmarkGrid({
  bookmarks,
  folders,
  order,
  viewMode,
  onEdit,
  onDelete,
  onOpenFolder,
  onEditFolder,
  onDeleteFolder,
  emptyHint,
}: {
  bookmarks: BookmarkNode[]
  folders: BookmarkNode[]
  order: 'bookmarks-first' | 'folders-first'
  viewMode: 'grid' | 'list'
  onEdit: (node: BookmarkNode) => void
  onDelete: (node: BookmarkNode) => void
  onOpenFolder: (node: BookmarkNode) => void
  onEditFolder: (node: BookmarkNode) => void
  onDeleteFolder: (node: BookmarkNode) => void
  emptyHint?: string
}) {
  const items: BookmarkNode[] =
    order === 'folders-first' ? [...folders, ...bookmarks] : [...bookmarks, ...folders]

  if (items.length === 0) {
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
      <SortableContext items={items.map((n) => n.id)} strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
        <div
          className={clsx(
            viewMode === 'grid'
              ? 'grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3'
              : 'flex flex-col gap-1',
          )}
        >
          {items.map((node) =>
            node.url ? (
              <BookmarkCard key={node.id} node={node} viewMode={viewMode} onEdit={() => onEdit(node)} onDelete={() => onDelete(node)} />
            ) : (
              <FolderCard
                key={node.id}
                node={node}
                viewMode={viewMode}
                onOpen={() => onOpenFolder(node)}
                onEdit={() => onEditFolder(node)}
                onDelete={() => onDeleteFolder(node)}
              />
            ),
          )}
        </div>
      </SortableContext>
    </div>
  )
}
