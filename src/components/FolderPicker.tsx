import type { FlatFolder } from '../types'

export function FolderPicker({
  folders,
  value,
  onChange,
  excludeIds,
}: {
  folders: FlatFolder[]
  value: string
  onChange: (id: string) => void
  excludeIds?: Set<string>
}) {
  const options = excludeIds ? folders.filter((f) => !excludeIds.has(f.id)) : folders
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:ring-indigo-500/20"
    >
      {options.map((f) => (
        <option key={f.id} value={f.id}>
          {'  '.repeat(f.depth)}
          {f.depth > 0 ? '↳ ' : ''}
          {f.title}
        </option>
      ))}
    </select>
  )
}
