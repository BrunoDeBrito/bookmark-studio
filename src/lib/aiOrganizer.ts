import type { AIProvider } from './ai/provider'
import type { LinkItem, Progress } from './organize'
import {
  AssignmentSchema,
  RULES,
  TaxonomySchema,
  classifyPrompt,
  classifySystem,
  cleanPath,
  taxonomyPrompt,
} from './organizerPrompt'

const BATCH_SIZE = 150

/** Asks the AI for the folder tree that fits these links. */
export async function designTaxonomy(provider: AIProvider, links: LinkItem[]): Promise<string[]> {
  const taxonomy = await provider.generateJSON({ system: RULES, prompt: taxonomyPrompt(links), schema: TaxonomySchema })
  return [...new Set(taxonomy.folders.map(cleanPath).filter(Boolean))]
}

/**
 * Assigns every link to one of `folders` (or "" for the root), in batches.
 * Links the AI skips or sends to an unknown folder stay where they are when that folder
 * survives, otherwise they go to the root, so no link is ever lost.
 */
export async function classifyLinks(
  provider: AIProvider,
  links: LinkItem[],
  folders: string[],
  onProgress?: Progress,
): Promise<Map<string, string>> {
  const known = new Set(folders)
  const system = classifySystem(folders)
  const queue: LinkItem[][] = []
  for (let i = 0; i < links.length; i += BATCH_SIZE) queue.push(links.slice(i, i + BATCH_SIZE))
  const total = queue.length

  const assignments = new Map<string, string>()
  let finished = 0
  onProgress?.(`Classificando links... lote 0/${total}`)
  async function worker() {
    for (let batch = queue.shift(); batch; batch = queue.shift()) {
      const result = await provider.generateJSON({ system, prompt: classifyPrompt(batch), schema: AssignmentSchema })
      for (const { id, folder } of result.assignments) assignments.set(id, cleanPath(folder))
      finished++
      onProgress?.(`Classificando links... lote ${finished}/${total}`)
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(provider.concurrency, total)) }, worker))

  const plan = new Map<string, string>()
  for (const link of links) {
    const folder = assignments.get(link.id)
    if (folder !== undefined && (folder === '' || known.has(folder))) plan.set(link.id, folder)
    else plan.set(link.id, known.has(link.path) ? link.path : '')
  }
  return plan
}

/** Designs a folder tree for the links, then assigns each link to it. Returns id -> folder path. */
export async function planWithAI(provider: AIProvider, links: LinkItem[], onProgress?: Progress) {
  onProgress?.(`Analisando ${links.length} links para montar as pastas (${provider.name})...`)
  const folders = await designTaxonomy(provider, links)
  return classifyLinks(provider, links, folders, onProgress)
}
