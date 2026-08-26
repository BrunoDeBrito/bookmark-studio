import { ArrowLeft, ArrowUpDown, FolderPlus, LayoutGrid, List, Moon, Plus, Search, Sun } from 'lucide-react'
import clsx from 'clsx'

export function Toolbar({
  title,
  canGoBack,
  onBack,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  folderOrder,
  onToggleFolderOrder,
  theme,
  onToggleTheme,
  onNewBookmark,
  onNewFolder,
}: {
  title: string
  canGoBack: boolean
  onBack: () => void
  searchQuery: string
  onSearchChange: (q: string) => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (m: 'grid' | 'list') => void
  folderOrder: 'bookmarks-first' | 'folders-first'
  onToggleFolderOrder: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onNewBookmark: () => void
  onNewFolder: () => void
}) {
  return (
    <div className="sticky top-0 z-10 flex flex-col gap-3 border-b border-slate-200/70 bg-slate-50/80 px-6 py-4 backdrop-blur-xl dark:border-white/5 dark:bg-[#0b0b14]/80 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        {canGoBack && (
          <button
            onClick={onBack}
            title="Voltar"
            className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <ArrowLeft size={17} />
          </button>
        )}
        <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
      </div>

      <div className="flex flex-1 items-center gap-2 sm:max-w-md">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="bookmark-search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar bookmarks... (Ctrl+K)"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-white/5 dark:focus:ring-indigo-500/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 dark:border-white/10 dark:bg-white/5">
          <ViewButton active={viewMode === 'grid'} onClick={() => onViewModeChange('grid')}>
            <LayoutGrid size={15} />
          </ViewButton>
          <ViewButton active={viewMode === 'list'} onClick={() => onViewModeChange('list')}>
            <List size={15} />
          </ViewButton>
        </div>

        <IconButton
          onClick={onToggleFolderOrder}
          label={folderOrder === 'bookmarks-first' ? 'Mostrar pastas primeiro' : 'Mostrar bookmarks primeiro'}
        >
          <ArrowUpDown size={15} />
        </IconButton>

        <IconButton onClick={onToggleTheme} label={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>

        <IconButton onClick={onNewFolder} label="Nova pasta">
          <FolderPlus size={16} />
        </IconButton>

        <button
          onClick={onNewBookmark}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-400 hover:to-purple-400"
        >
          <Plus size={15} />
          Novo
        </button>
      </div>
    </div>
  )
}

function ViewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'rounded-lg p-1.5 transition',
        active
          ? 'bg-indigo-500 text-white shadow-sm'
          : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10',
      )}
    >
      {children}
    </button>
  )
}

function IconButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
    >
      {children}
    </button>
  )
}
