import { useState } from 'react'
import { Modal } from './Modal'
import { FolderPicker } from './FolderPicker'
import type { BookmarkNode, FlatFolder } from '../types'

export function BookmarkFormModal({
  folders,
  defaultFolderId,
  editing,
  onClose,
  onSubmit,
}: {
  folders: FlatFolder[]
  defaultFolderId: string
  editing?: BookmarkNode
  onClose: () => void
  onSubmit: (data: { title: string; url: string; folderId: string }) => void
}) {
  const [title, setTitle] = useState(editing?.title ?? '')
  const [url, setUrl] = useState(editing?.url ?? '')
  const [folderId, setFolderId] = useState(editing?.parentId ?? defaultFolderId)

  const canSubmit = title.trim().length > 0 && isLikelyUrl(url)

  return (
    <Modal title={editing ? 'Editar bookmark' : 'Novo bookmark'} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({ title: title.trim(), url: normalizeUrl(url.trim()), folderId })
        }}
      >
        <Field label="Título">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Documentação do React"
            className={inputClass}
          />
        </Field>
        <Field label="URL">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://exemplo.com"
            className={inputClass}
          />
        </Field>
        <Field label="Pasta">
          <FolderPicker folders={folders} value={folderId} onChange={setFolderId} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-400 hover:to-purple-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {editing ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:ring-indigo-500/20'

function isLikelyUrl(value: string) {
  if (!value.trim()) return false
  try {
    new URL(normalizeUrl(value.trim()))
    return true
  } catch {
    return false
  }
}

function normalizeUrl(value: string) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return value
  return `https://${value}`
}
