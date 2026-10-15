import { Modal } from './Modal'

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Excluir',
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="mb-5 text-sm text-slate-600 dark:text-slate-300">{message}</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/10"
        >
          Cancelar
        </button>
        <button
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-red-500/25 transition hover:bg-red-400"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
