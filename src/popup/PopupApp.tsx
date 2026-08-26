import { useEffect, useMemo, useState } from 'react'
import { Bookmark, Maximize2, Moon, Search, Sun } from 'lucide-react'
import { bookmarksApi } from '../lib/bookmarksApi'
import { faviconUrl } from '../lib/favicon'
import { openManager } from '../lib/openManager'
import { useTheme } from '../lib/useTheme'
import { recentBookmarks, searchBookmarks } from '../store/useBookmarkStore'
import { PopupTreeNode } from './PopupTreeNode'
import type { BookmarkNode } from '../types'

export default function PopupApp() {
  const { theme, toggle: toggleTheme } = useTheme()
  const [roots, setRoots] = useState<BookmarkNode[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    bookmarksApi.getTree().then((tree) => {
      setRoots(tree)
      setLoading(false)
      const firstFolder = tree.flatMap((r) => (r.children ?? []).filter((c) => !c.url))[0]
      if (firstFolder) setExpanded({ [firstFolder.id]: true })
    })
  }, [])

  const isSearching = query.trim().length > 0
  const searchResults = useMemo(() => searchBookmarks(roots, query), [roots, query])
  const topFolders = useMemo(() => roots.flatMap((r) => (r.children ?? []).filter((c) => !c.url)), [roots])
  const totalBookmarks = useMemo(() => recentBookmarks(roots, Infinity).length, [roots])

  function toggleFolder(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="flex h-[520px] w-[380px] flex-col bg-slate-50 text-slate-900 dark:bg-[#0b0b14] dark:text-slate-100">
      <header className="flex items-center gap-2.5 border-b border-slate-200/70 px-4 py-3.5 dark:border-white/5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25">
          <Bookmark size={16} fill="currentColor" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-none">Bookmark Studio</p>
          <p className="mt-1 text-[11px] text-slate-400">{totalBookmarks} bookmarks</p>
        </div>
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </header>

      <div className="px-4 pt-3">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar bookmarks..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-white/5 dark:focus:ring-indigo-500/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-2.5">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-slate-400">Carregando...</div>
        ) : isSearching ? (
          searchResults.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-10 text-center text-slate-400">
              <Bookmark size={20} className="opacity-50" />
              <p className="text-sm">Nada encontrado.</p>
            </div>
          ) : (
            <ul className="space-y-0.5">
              {searchResults.map((node) => (
                <li key={node.id}>
                  <a
                    href={node.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-white hover:shadow-sm dark:hover:bg-white/5"
                  >
                    <PopupFavicon url={node.url} />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200">
                      {node.title || node.url}
                    </span>
                    <span className="hidden shrink-0 truncate text-[11px] text-slate-400 sm:inline">
                      {hostnameOf(node.url)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )
        ) : topFolders.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-10 text-center text-slate-400">
            <Bookmark size={20} className="opacity-50" />
            <p className="text-sm">Nenhuma pasta ainda.</p>
          </div>
        ) : (
          <div>
            {topFolders.map((folder) => (
              <PopupTreeNode key={folder.id} node={folder} depth={0} expanded={expanded} onToggle={toggleFolder} />
            ))}
          </div>
        )}
      </div>

      <footer className="border-t border-slate-200/70 p-3 dark:border-white/5">
        <button
          onClick={() => openManager()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-400 hover:to-purple-400"
        >
          <Maximize2 size={14} />
          Abrir gerenciador completo
        </button>
      </footer>
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
