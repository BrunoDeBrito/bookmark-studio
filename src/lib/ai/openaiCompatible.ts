import { z } from 'zod'
import { AIProviderError, type AIProvider } from './provider'

// Talks to any server that implements the OpenAI Chat Completions format (OpenAI, OpenRouter,
// Ollama, Groq, DeepSeek, LM Studio...). Plain fetch keeps it free of vendor SDKs.

interface ChatResponse {
  choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[]
  error?: { message?: string }
}

export function createOpenAICompatibleProvider(config: {
  name: string
  baseUrl: string
  apiKey: string
  model: string
  concurrency: number
}): AIProvider {
  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`

  async function post(body: Record<string, unknown>): Promise<Response> {
    try {
      return await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
      })
    } catch {
      throw new AIProviderError(`Não foi possível conectar a ${config.name} (${config.baseUrl}).`)
    }
  }

  return {
    name: config.name,
    concurrency: config.concurrency,
    async generateJSON({ system, prompt, schema, maxTokens = 16000 }) {
      if (!config.model) throw new AIProviderError('Informe o modelo a usar.')
      if (!config.baseUrl) throw new AIProviderError('Informe a URL base da API.')
      // `$schema` is metadata some servers reject inside response_format.
      const { $schema: _, ...jsonSchema } = z.toJSONSchema(schema)
      const messages = [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ]
      const base = { model: config.model, max_tokens: maxTokens, messages }

      // Prefer strict JSON-schema output; servers that don't support it get plain JSON mode
      // with the schema spelled out in the prompt. Either way we validate with zod below.
      let res = await post({
        ...base,
        response_format: { type: 'json_schema', json_schema: { name: 'result', schema: jsonSchema, strict: true } },
      })
      if (res.status === 400 || res.status === 422) {
        res = await post({
          ...base,
          messages: [
            { role: 'system', content: `${system}\n\nReply with only a JSON object matching this JSON Schema:\n${JSON.stringify(jsonSchema)}` },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
        })
      }

      if (res.status === 401 || res.status === 403) throw new AIProviderError('Chave da API inválida ou sem permissão.')
      if (res.status === 429) throw new AIProviderError('Limite de uso da API atingido. Espere um pouco e tente de novo.')
      const data = (await res.json().catch(() => ({}))) as ChatResponse
      if (!res.ok) throw new AIProviderError(`${config.name} respondeu com erro ${res.status}: ${data.error?.message ?? ''}`)

      const choice = data.choices?.[0]
      if (choice?.message?.refusal) throw new AIProviderError('A IA recusou o pedido. Tente novamente.')
      if (choice?.finish_reason === 'length') {
        throw new AIProviderError('A resposta da IA foi cortada. Tente com uma pasta menor.')
      }
      const parsed = schema.safeParse(parseJson(choice?.message?.content ?? ''))
      if (!parsed.success) throw new AIProviderError('A IA devolveu uma resposta fora do formato esperado.')
      return parsed.data
    },
  }
}

/** Parses JSON, tolerating models that wrap it in a ```json fence. */
function parseJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  try {
    return JSON.parse(fenced ? fenced[1] : text)
  } catch {
    return undefined
  }
}
