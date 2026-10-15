import { Suspense, lazy, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, ArrowDownAZ, CheckCircle2, Folder, Loader2, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { Modal } from './Modal'
import { applyPlan, collectLinks, downloadBackup, findDuplicates, sortAlphabetically, type OrganizePlan } from '../lib/organize'
import { Checkbox } from './formControls'
import type { AIRunConfig } from '../lib/ai/run'
import type { BookmarkNode } from '../types'

// Loaded only in builds with VITE_ENABLE_AI=true; otherwise none of the AI code is bundled.
// The flag is checked inline (not via AI_ENABLED) so the bundler sees a literal condition and drops
// the import entirely.
const AIProviderFields = import.meta.env.VITE_ENABLE_AI === 'true' ? lazy(() => import('./AIProviderFields')) : null

type Mode = 'alphabetical' | 'full'

type Step =
  | { type: 'choose' }
  | { type: 'working'; message: string }
  | { type: 'preview'; plan: OrganizePlan; linkCount: number }
  | { type: 'done'; message: string }
  | { type: 'error'; message: string }

export function OrganizeModal({
  folder,
  onClose,
  onFinished,
}: {
  folder: BookmarkNode
  onClose: () => void
  onFinished: () => void
}) {
  const [mode, setMode] = useState<Mode>('alphabetical')
  const [recursive, setRecursive] = useState(true)
  const [aiConfig, setAIConfig] = useState<AIRunConfig | null>(null)
  const [backup, setBackup] = useState(true)
  const [step, setStep] = useState<Step>({ type: 'choose' })

  const progress = (message: string) => setStep({ type: 'working', message })
  const busy = step.type === 'working'
  const title = `Organizar "${folder.title || 'pasta'}"`

  async function run() {
    try {
      if (mode === 'alphabetical') {
        progress('Ordenando...')
        await sortAlphabetically(folder.id, recursive, progress)
        onFinished()
        setStep({ type: 'done', message: 'Pastas e links ficaram em ordem alfabética, com as pastas primeiro.' })
        return
      }
      if (import.meta.env.VITE_ENABLE_AI !== 'true' || !aiConfig) return
      const { runAIPlan } = await import('../lib/ai/run')
      const { unique, duplicates } = findDuplicates(collectLinks(folder))
      const assignments = await runAIPlan(aiConfig, unique, progress)
      setStep({ type: 'preview', plan: { assignments, duplicates }, linkCount: unique.length })
    } catch (err) {
      setStep({ type: 'error', message: errorMessage(err) })
    }
  }

  async function apply(plan: OrganizePlan) {
    try {
      if (backup) downloadBackup(folder)
      await applyPlan(folder.id, plan, progress)
      onFinished()
      setStep({
        type: 'done',
        message: `${plan.assignments.size} links organizados e ${plan.duplicates.length} duplicados removidos.`,
      })
    } catch (err) {
      onFinished()
      setStep({ type: 'error', message: errorMessage(err) })
    }
  }

  return (
    <Modal title={title} onClose={busy ? () => {} : onClose} size={step.type === 'preview' ? 'lg' : 'md'}>
      {step.type === 'choose' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">Como você quer organizar esta pasta?</p>

          <ModeOption
            active={mode === 'alphabetical'}
            onClick={() => setMode('alphabetical')}
            icon={<ArrowDownAZ size={18} />}
            title="Só ordem alfabética"
            description="Mantém as pastas como estão e só ordena: pastas primeiro, depois links, de A a Z."
          >
            <Checkbox checked={recursive} onChange={setRecursive} label="Incluir todas as subpastas" />
          </ModeOption>

          {AIProviderFields && (
            <ModeOption
              active={mode === 'full'}
              onClick={() => setMode('full')}
              icon={<Sparkles size={18} />}
              title="Organização completa (IA)"
              description="A IA cria pastas por tema, move cada link para o lugar certo, remove duplicados e deixa tudo em ordem alfabética. Você vê a prévia antes de aplicar."
            >
              <Suspense fallback={<Loader2 className="animate-spin text-indigo-500" size={16} />}>
                <AIProviderFields onChange={setAIConfig} />
              </Suspense>
            </ModeOption>
          )}

          <Actions>
            <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
            <PrimaryButton onClick={run} disabled={mode === 'full' && !aiConfig}>
              {mode === 'alphabetical' ? 'Ordenar' : 'Analisar com IA'}
            </PrimaryButton>
          </Actions>
        </div>
      )}

      {step.type === 'working' && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Loader2 className="animate-spin text-indigo-500" size={28} />
          <p className="text-sm text-slate-600 dark:text-slate-300">{step.message}</p>
          <p className="text-xs text-slate-400">Não feche esta aba.</p>
        </div>
      )}

      {step.type === 'preview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat value={step.linkCount} label="links" />
            <Stat value={step.plan.duplicates.length} label="duplicados removidos" />
            <Stat value={countFolders(step.plan)} label="pastas" />
          </div>
          <PlanTree plan={step.plan} />
          <Checkbox checked={backup} onChange={setBackup} label="Baixar um backup desta pasta antes de aplicar" />
          <Actions>
            <SecondaryButton onClick={() => setStep({ type: 'choose' })}>Voltar</SecondaryButton>
            <PrimaryButton onClick={() => apply(step.plan)}>Aplicar</PrimaryButton>
          </Actions>
        </div>
      )}

      {step.type === 'done' && (
        <ResultMessage icon={<CheckCircle2 className="text-emerald-500" size={28} />} message={step.message}>
          <PrimaryButton onClick={onClose}>Fechar</PrimaryButton>
        </ResultMessage>
      )}

      {step.type === 'error' && (
        <ResultMessage icon={<AlertTriangle className="text-amber-500" size={28} />} message={step.message}>
          <SecondaryButton onClick={onClose}>Fechar</SecondaryButton>
          <PrimaryButton onClick={() => setStep({ type: 'choose' })}>Tentar de novo</PrimaryButton>
        </ResultMessage>
      )}
    </Modal>
  )
}

interface TreeEntry {
  name: string
  count: number
  children: Map<string, TreeEntry>
}

function buildTree(plan: OrganizePlan): TreeEntry {
  const root: TreeEntry = { name: '', count: 0, children: new Map() }
  for (const path of plan.assignments.values()) {
    let node = root
    node.count++
    for (const part of path ? path.split('/') : []) {
      let child = node.children.get(part)
      if (!child) {
        child = { name: part, count: 0, children: new Map() }
        node.children.set(part, child)
      }
      child.count++
      node = child
    }
  }
  return root
}

function countFolders(plan: OrganizePlan): number {
  return new Set([...plan.assignments.values()].flatMap((p) => (p ? p.split('/').map((_, i, a) => a.slice(0, i + 1).join('/')) : []))).size
}

function PlanTree({ plan }: { plan: OrganizePlan }) {
  const tree = useMemo(() => buildTree(plan), [plan])
  const directLinks = tree.count - [...tree.children.values()].reduce((n, c) => n + c.count, 0)
  return (
    <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/5">
      <TreeLevel entries={tree.children} depth={0} />
      {directLinks > 0 && (
        <p className="mt-1 text-xs text-slate-400">+ {directLinks} links soltos na raiz</p>
      )}
    </div>
  )
}

function TreeLevel({ entries, depth }: { entries: Map<string, TreeEntry>; depth: number }) {
  const sorted = [...entries.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }))
  return (
    <ul>
      {sorted.map((entry) => (
        <li key={entry.name}>
          <div className="flex items-center gap-1.5 py-0.5" style={{ paddingLeft: depth * 16 }}>
            <Folder size={14} className="shrink-0 text-indigo-400" />
            <span className="truncate text-slate-700 dark:text-slate-200">{entry.name}</span>
            <span className="text-xs text-slate-400">{entry.count}</span>
          </div>
          {entry.children.size > 0 && <TreeLevel entries={entry.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  )
}

function ModeOption({
  active,
  onClick,
  icon,
  title,
  description,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'cursor-pointer rounded-xl border p-3 transition',
        active
          ? 'border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-100 dark:border-indigo-500/50 dark:bg-indigo-500/10 dark:ring-indigo-500/20'
          : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5',
      )}
    >
      <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
        <span className="text-indigo-500">{icon}</span>
        {title}
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      {active && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-2 py-2 dark:border-white/10 dark:bg-white/5">
      <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  )
}

function ResultMessage({ icon, message, children }: { icon: ReactNode; message: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        {icon}
        <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
      </div>
      <Actions>{children}</Actions>
    </div>
  )
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-2 pt-2">{children}</div>
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/10"
    >
      {children}
    </button>
  )
}

function PrimaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-400 hover:to-purple-400 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Algo deu errado ao organizar.'
}
