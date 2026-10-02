// Compares AI providers on the organizer's classification step.
//
// The folder tree is fixed to the expected folders of evals/dataset.json, so every provider is
// graded on the same question: "which folder does this link belong in?".
//
// Usage (each run calls the provider's API and costs money):
//   EVAL_PRESET=anthropic EVAL_API_KEY=sk-ant-... npm run eval
//   EVAL_PRESET=openrouter EVAL_API_KEY=... EVAL_MODEL=provider/model npm run eval
//   EVAL_PRESET=ollama EVAL_MODEL=model-name npm run eval
// Optional: EVAL_BASE_URL overrides the preset's URL, EVAL_LIMIT=50 runs a smaller sample.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { classifyLinks } from '../src/lib/aiOrganizer'
import { createProvider, defaultSettings } from '../src/lib/ai/provider'
import type { LinkItem } from '../src/lib/organize'

interface Case {
  id: string
  title: string
  url: string
  expected: string
}

const here = new URL('.', import.meta.url)
const all: Case[] = JSON.parse(readFileSync(new URL('dataset.json', here), 'utf8'))
const cases = process.env.EVAL_LIMIT ? all.slice(0, Number(process.env.EVAL_LIMIT)) : all

const settings = defaultSettings(process.env.EVAL_PRESET ?? 'anthropic')
settings.apiKey = process.env.EVAL_API_KEY ?? ''
if (process.env.EVAL_MODEL) settings.model = process.env.EVAL_MODEL
if (process.env.EVAL_BASE_URL) settings.baseUrl = process.env.EVAL_BASE_URL
const provider = await createProvider(settings)

// Every expected path plus its parents, as the organizer would have them.
const folders = [
  ...new Set(cases.flatMap((c) => c.expected.split('/').map((_, i, parts) => parts.slice(0, i + 1).join('/')))),
]
// Links start "unfiled" so the current folder gives no hint.
const links: LinkItem[] = cases.map((c) => ({ id: c.id, title: c.title, url: c.url, path: '' }))

console.log(`Provider: ${provider.name} · model: ${settings.model || '(preset default)'} · ${cases.length} links`)
const started = Date.now()
const plan = await classifyLinks(provider, links, folders, (m) => console.log(m))
const seconds = (Date.now() - started) / 1000

let exact = 0
let topLevel = 0
let atRoot = 0
const misses: { title: string; expected: string; got: string }[] = []
for (const c of cases) {
  const got = plan.get(c.id) ?? ''
  if (got === '') atRoot++
  if (got === c.expected) exact++
  else misses.push({ title: c.title, expected: c.expected, got })
  if (got.split('/')[0] === c.expected.split('/')[0]) topLevel++
}

const pct = (n: number) => `${((n / cases.length) * 100).toFixed(1)}%`
console.log(`\nExact folder:     ${pct(exact)} (${exact}/${cases.length})`)
console.log(`Right top-level:  ${pct(topLevel)}`)
console.log(`Left at root:     ${atRoot}`)
console.log(`Time:             ${seconds.toFixed(1)}s`)

mkdirSync(new URL('results/', here), { recursive: true })
const file = new URL(`results/${settings.presetId}-${Date.now()}.json`, here)
writeFileSync(
  file,
  JSON.stringify(
    { provider: provider.name, model: settings.model, cases: cases.length, exact, topLevel, atRoot, seconds, misses },
    null,
    2,
  ),
)
console.log(`Misses saved to ${file.pathname}`)
