import { planWithAI } from '../aiOrganizer'
import type { LinkItem, Progress } from '../organize'
import { createProvider, saveSettings, type ProviderSettings } from './provider'

/** What the organize dialog collects before running the AI. */
export interface AIRunConfig {
  settings: ProviderSettings
  rememberKey: boolean
}

/** Saves the chosen provider and asks it for a plan: bookmark id -> folder path. */
export async function runAIPlan(config: AIRunConfig, links: LinkItem[], onProgress?: Progress) {
  const { settings, rememberKey } = config
  const clean = {
    ...settings,
    apiKey: settings.apiKey.trim(),
    model: settings.model.trim(),
    baseUrl: settings.baseUrl.trim(),
  }
  saveSettings(clean, rememberKey)
  return planWithAI(await createProvider(clean), links, onProgress)
}
