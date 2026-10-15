import type { z } from 'zod'

/** The only contract the organizer needs from an AI: instructions in, schema-validated JSON out. */
export interface AIProvider {
  name: string
  /** How many requests to run in parallel. Local models should use 1. */
  concurrency: number
  generateJSON<T>(input: { system: string; prompt: string; schema: z.ZodType<T>; maxTokens?: number }): Promise<T>
}

/** Raised for failures the user can fix (bad key, rate limit, unreachable server, refusal). */
export class AIProviderError extends Error {}

export type ProviderKind = 'anthropic' | 'openai-compatible'

export interface ProviderPreset {
  id: string
  label: string
  kind: ProviderKind
  baseUrl: string
  /** Pre-filled model, only where we know the exact id. Otherwise the user types it. */
  defaultModel: string
  modelPlaceholder: string
  needsKey: boolean
  concurrency: number
  hint?: string
}

export const PRESETS: ProviderPreset[] = [
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    kind: 'anthropic',
    baseUrl: '',
    defaultModel: 'claude-opus-5-5',
    modelPlaceholder: 'claude-opus-5-5',
    needsKey: true,
    concurrency: 3,
  },
  {
    id: 'openai',
    label: 'OpenAI',
    kind: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: '',
    modelPlaceholder: 'id do modelo na OpenAI',
    needsKey: true,
    concurrency: 3,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter (vários provedores)',
    kind: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: '',
    modelPlaceholder: 'ex.: provedor/modelo',
    needsKey: true,
    concurrency: 3,
    hint: 'Uma chave do OpenRouter dá acesso a modelos de vários provedores.',
  },
  {
    id: 'ollama',
    label: 'Ollama (local, grátis)',
    kind: 'openai-compatible',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: '',
    modelPlaceholder: 'nome do modelo baixado no Ollama',
    needsKey: false,
    concurrency: 1,
    hint: 'Inicie o Ollama com OLLAMA_ORIGINS="chrome-extension://*,moz-extension://*" para a extensão conseguir acessá-lo.',
  },
  {
    id: 'custom',
    label: 'Outro compatível com OpenAI',
    kind: 'openai-compatible',
    baseUrl: '',
    defaultModel: '',
    modelPlaceholder: 'id do modelo',
    needsKey: false,
    concurrency: 2,
    hint: 'Groq, DeepSeek, Mistral, LM Studio e outros que aceitam o formato da API da OpenAI.',
  },
]

export interface ProviderSettings {
  presetId: string
  apiKey: string
  baseUrl: string
  model: string
}

export function presetById(id: string): ProviderPreset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0]
}

export function defaultSettings(presetId: string): ProviderSettings {
  const preset = presetById(presetId)
  return { presetId: preset.id, apiKey: '', baseUrl: preset.baseUrl, model: preset.defaultModel }
}

export async function createProvider(settings: ProviderSettings): Promise<AIProvider> {
  const preset = presetById(settings.presetId)
  // Adapters are loaded on demand so the bundle only pulls in the SDK that is actually used.
  if (preset.kind === 'anthropic') {
    const { createAnthropicProvider } = await import('./anthropic')
    return createAnthropicProvider({ apiKey: settings.apiKey, model: settings.model || preset.defaultModel })
  }
  const { createOpenAICompatibleProvider } = await import('./openaiCompatible')
  return createOpenAICompatibleProvider({
    name: preset.label,
    baseUrl: settings.baseUrl || preset.baseUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    concurrency: preset.concurrency,
  })
}

// ---- Persistence: per-preset settings in this browser only ----

const SETTINGS_KEY = 'bookmark-studio-ai-settings-v1'
const LEGACY_ANTHROPIC_KEY = 'bookmark-studio-anthropic-key'

interface StoredSettings {
  selected: string
  byPreset: Record<string, Omit<ProviderSettings, 'presetId'>>
}

function readStore(): StoredSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return JSON.parse(raw)
    const legacyKey = localStorage.getItem(LEGACY_ANTHROPIC_KEY)
    if (legacyKey) {
      const { presetId: _, ...anthropic } = { ...defaultSettings('anthropic'), apiKey: legacyKey }
      return { selected: 'anthropic', byPreset: { anthropic } }
    }
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  return { selected: 'anthropic', byPreset: {} }
}

export function loadSettings(presetId?: string): ProviderSettings {
  const store = readStore()
  const id = presetId ?? store.selected
  const saved = store.byPreset[id]
  return saved ? { presetId: id, ...saved } : defaultSettings(id)
}

/** Saves the chosen provider; the API key is kept only when `rememberKey` is true. */
export function saveSettings(settings: ProviderSettings, rememberKey: boolean) {
  try {
    const store = readStore()
    const { presetId, ...rest } = settings
    store.selected = presetId
    store.byPreset[presetId] = { ...rest, apiKey: rememberKey ? rest.apiKey : '' }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(store))
    localStorage.removeItem(LEGACY_ANTHROPIC_KEY)
  } catch {
    /* storage unavailable: settings just aren't remembered */
  }
}
