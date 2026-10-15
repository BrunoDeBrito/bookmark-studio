import { useEffect, useState } from 'react'
import { Checkbox, Field, inputClass } from './formControls'
import { PRESETS, loadSettings, presetById, type ProviderSettings } from '../lib/ai/provider'
import type { AIRunConfig } from '../lib/ai/run'

/** Provider, model and key inputs. Reports a complete config, or null while something is missing. */
export default function AIProviderFields({ onChange }: { onChange: (config: AIRunConfig | null) => void }) {
  const [settings, setSettings] = useState<ProviderSettings>(() => loadSettings())
  const [rememberKey, setRememberKey] = useState(() => loadSettings().apiKey !== '')
  const preset = presetById(settings.presetId)
  const update = (changes: Partial<ProviderSettings>) => setSettings((s) => ({ ...s, ...changes }))

  const ready =
    (!preset.needsKey || settings.apiKey.trim() !== '') &&
    (preset.kind === 'anthropic' || (settings.model.trim() !== '' && settings.baseUrl.trim() !== ''))

  useEffect(() => {
    onChange(ready ? { settings, rememberKey } : null)
  }, [ready, settings, rememberKey, onChange])

  return (
    <>
      <Field label="Provedor de IA">
        <select
          value={settings.presetId}
          onChange={(e) => setSettings(loadSettings(e.target.value))}
          className={inputClass}
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      {preset.hint && <p className="text-xs text-slate-400">{preset.hint}</p>}
      {preset.kind === 'openai-compatible' && (
        <Field label="URL base da API">
          <input
            value={settings.baseUrl}
            onChange={(e) => update({ baseUrl: e.target.value })}
            placeholder="https://.../v1"
            className={inputClass}
          />
        </Field>
      )}
      <Field label="Modelo">
        <input
          value={settings.model}
          onChange={(e) => update({ model: e.target.value })}
          placeholder={preset.modelPlaceholder}
          className={inputClass}
        />
      </Field>
      <Field label={preset.needsKey ? 'Chave da API' : 'Chave da API (opcional)'}>
        <input
          type="password"
          value={settings.apiKey}
          onChange={(e) => update({ apiKey: e.target.value })}
          placeholder="cole sua chave aqui"
          className={inputClass}
        />
      </Field>
      <Checkbox checked={rememberKey} onChange={setRememberKey} label="Lembrar a chave neste navegador" />
    </>
  )
}
