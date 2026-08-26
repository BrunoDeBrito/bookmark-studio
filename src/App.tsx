import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Bookmark } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { BookmarkGrid } from './components/BookmarkGrid'
import { BookmarkFormModal } from './components/BookmarkFormModal'
import { FolderFormModal } from './components/FolderFormModal'
import { ConfirmDialog } from './components/ConfirmDialog'
import { useTheme } from './lib/useTheme'
import { faviconUrl } from './lib/favicon'
import {
  useBookmarkStore,
  findNodeById,
  flattenFolders,
  isDescendant,
  searchBookmarks,
} from './store/useBookmarkStore'
import type { BookmarkNode, FlatFolder } from './types'

type ModalState =
  | { type: 'new-bookmark' }
  | { type: 'edit-bookmark'; node: BookmarkNode }
  | { type: 'new-folder' }
  | { type: 'edit-folder'; folder: FlatFolder }
  | { type: 'delete'; node: BookmarkNode }
  | null

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme()
  const {
    roots,
    loading,
    selectedFolderId,
    searchQuery,
    viewMode,
    folderOrder,
    expanded,
    folderHistory,
    load,
    selectFolder,
    goBack,
    toggleExpanded,
    setSearchQuery,
    setViewMode,
    toggleFolderOrder,
    createBookmark,
    createFolder,
    updateBookmark,
    moveNode,
    deleteNode,
  } = useBookmarkStore()

  const [modal, setModal] = useState<ModalState>(null)
  const [activeNode, setActiveNode] = useState<BookmarkNode | null>(null)

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        document.getElementById('bookmark-search')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const folders = useMemo(() => flattenFolders(roots), [roots])
  const selectedFolder = selectedFolderId ? findNodeById(roots, selectedFolderId) : undefined
  const isSearching = searchQuery.trim().length > 0

  const bookmarks: BookmarkNode[] = isSearching
    ? searchBookmarks(roots, searchQuery)
    : (selectedFolder?.children ?? []).filter((c: BookmarkNode) => !!c.url)
  const subfolders: BookmarkNode[] = isSearching
    ? []
    : (selectedFolder?.children ?? []).filter((c: BookmarkNode) => !c.url)

  const totalBookmarks = useMemo(() => countAll(roots), [roots])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function handleDragStart(event: DragStartEvent) {
    const node = findNodeById(roots, String(event.active.id))
    setActiveNode(node ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveNode(null)
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)

    if (overId.startsWith('folder:')) {
      const targetFolderId = overId.slice('folder:'.length)
      const node = findNodeById(roots, activeId)
      if (!node || node.parentId === targetFolderId || targetFolderId === activeId) return
      if (!node.url && isDescendant(roots, activeId, targetFolderId)) return
      moveNode(activeId, targetFolderId)
      return
    }

    if (activeId === overId) return
    const overNode = findNodeById(roots, overId)
    const activeNodeRef = findNodeById(roots, activeId)
    if (!overNode || !activeNodeRef || !overNode.parentId) return
    moveNode(activeId, overNode.parentId, overNode.index)
  }

  function countFor(folderId: string) {
    const node = findNodeById(roots, folderId)
    return (node?.children ?? []).filter((c: BookmarkNode) => !!c.url).length
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#0b0b14]">
        <div className="flex items-center gap-2 text-slate-400">
          <Bookmark className="animate-pulse" size={20} />
          <span className="text-sm">Carregando seus bookmarks...</span>
        </div>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          roots={roots}
          selectedId={selectedFolderId}
          expanded={expanded}
          onSelect={selectFolder}
          onToggle={toggleExpanded}
          countFor={countFor}
          bookmarkCount={totalBookmarks}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <Toolbar
            title={isSearching ? `Resultados para "${searchQuery}"` : selectedFolder?.title || 'Bookmarks'}
            canGoBack={!isSearching && folderHistory.length > 0}
            onBack={goBack}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            folderOrder={folderOrder}
            onToggleFolderOrder={toggleFolderOrder}
            theme={theme}
            onToggleTheme={toggleTheme}
            onNewBookmark={() => setModal({ type: 'new-bookmark' })}
            onNewFolder={() => setModal({ type: 'new-folder' })}
          />

          <BookmarkGrid
            bookmarks={bookmarks}
            folders={subfolders}
            order={folderOrder}
            viewMode={viewMode}
            onEdit={(node) => setModal({ type: 'edit-bookmark', node })}
            onDelete={(node) => setModal({ type: 'delete', node })}
            onOpenFolder={(node) => selectFolder(node.id)}
            onEditFolder={(node) =>
              setModal({
                type: 'edit-folder',
                folder: { id: node.id, title: node.title, parentId: node.parentId, depth: 0 },
              })
            }
            onDeleteFolder={(node) => setModal({ type: 'delete', node })}
            emptyHint={
              isSearching
                ? 'Tente outro termo de busca.'
                : 'Arraste bookmarks para cá ou clique em "Novo" para adicionar.'
            }
          />
        </div>
      </div>

      <DragOverlay>
        {activeNode && (
          <div className="flex max-w-xs items-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 shadow-2xl dark:border-indigo-500/30 dark:bg-[#14141f]">
            <img src={faviconUrl(activeNode.url ?? '', 18)} className="h-4 w-4 rounded" alt="" />
            <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
              {activeNode.title || activeNode.url}
            </span>
          </div>
        )}
      </DragOverlay>

      {modal?.type === 'new-bookmark' && (
        <BookmarkFormModal
          folders={folders}
          defaultFolderId={selectedFolderId ?? folders[0]?.id ?? ''}
          onClose={() => setModal(null)}
          onSubmit={({ title, url, folderId }) => {
            createBookmark(folderId, title, url)
            setModal(null)
          }}
        />
      )}

      {modal?.type === 'edit-bookmark' && (
        <BookmarkFormModal
          folders={folders}
          defaultFolderId={modal.node.parentId ?? folders[0]?.id ?? ''}
          editing={modal.node}
          onClose={() => setModal(null)}
          onSubmit={({ title, url, folderId }) => {
            updateBookmark(modal.node.id, title, url)
            if (folderId !== modal.node.parentId) moveNode(modal.node.id, folderId)
            setModal(null)
          }}
        />
      )}

      {modal?.type === 'new-folder' && (
        <FolderFormModal
          folders={folders}
          defaultParentId={selectedFolderId ?? folders[0]?.id ?? ''}
          onClose={() => setModal(null)}
          onSubmit={({ title, parentId }) => {
            createFolder(parentId, title)
            setModal(null)
          }}
        />
      )}

      {modal?.type === 'edit-folder' && (
        <FolderFormModal
          folders={folders}
          defaultParentId={modal.folder.parentId ?? folders[0]?.id ?? ''}
          editing={modal.folder}
          onClose={() => setModal(null)}
          onSubmit={({ title }) => {
            updateBookmark(modal.folder.id, title)
            setModal(null)
          }}
        />
      )}

      {modal?.type === 'delete' && (
        <ConfirmDialog
          title={modal.node.url ? 'Excluir bookmark' : 'Excluir pasta'}
          message={`Tem certeza que deseja excluir "${modal.node.title || modal.node.url}"? Essa ação não pode ser desfeita.`}
          onClose={() => setModal(null)}
          onConfirm={() => deleteNode(modal.node.id)}
        />
      )}
    </DndContext>
  )
}

function countAll(roots: BookmarkNode[]): number {
  let n = 0
  function walk(nodes: BookmarkNode[]) {
    for (const node of nodes) {
      if (node.url) n++
      if (node.children) walk(node.children)
    }
  }
  walk(roots)
  return n
}
