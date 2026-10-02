import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({
  title,
  onClose,
  children,
  size = 'md',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  size?: 'md' | 'lg'
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`w-full ${size === 'lg' ? 'max-w-xl' : 'max-w-md'} rounded-2xl border border-slate-200/70 bg-white p-5 shadow-2xl shadow-slate-900/10 dark:border-white/10 dark:bg-[#14141f]`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
