import { useState } from 'react'
import { Modal } from './Modal'
import { FolderPicker } from './FolderPicker'
import type { FlatFolder } from '../types'

export function FolderFormModal({
  folders,
  defaultParentId,
  editing,
  onClose,
  onSubmit,
}: {
  folders: FlatFolder[]
  defaultParentId: string
  editing?: FlatFolder
  onClose: () => void
  onSubmit: (data: { title: string; parentId: string }) => void
}) {
  const [title, setTitle] = useState(editing?.title ?? '')
  const [parentId, setParentId] = useState(editing?.parentId ?? defaultParentId)

  const excludeIds = editing ? new Set([editing.id]) : undefined
  const canSubmit = title.trim().length > 0

  return (
    <Modal title={editing ? 'Renomear pasta' : 'Nova pasta'} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({ title: title.trim(), parentId })
        }}
      >
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Nome</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Projetos pessoais"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:ring-indigo-500/20"
          />
        </label>
        {!editing && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Pasta pai
            </span>
            <FolderPicker folders={folders} value={parentId} onChange={setParentId} excludeIds={excludeIds} />
          </label>
        )}
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
