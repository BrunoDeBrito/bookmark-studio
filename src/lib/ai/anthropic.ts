import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { AIProviderError, type AIProvider } from './provider'

export function createAnthropicProvider({ apiKey, model }: { apiKey: string; model: string }): AIProvider {
  // The key belongs to the user and only travels from their browser to Anthropic.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  return {
    name: 'Anthropic',
    concurrency: 3,
    async generateJSON({ system, prompt, schema, maxTokens = 16000 }) {
      try {
        const response = await client.beta.messages.parse({
          model,
          max_tokens: maxTokens,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          output_config: { effort: 'medium', format: betaZodOutputFormat(schema) },
          messages: [{ role: 'user', content: prompt }],
        })
        if (response.stop_reason === 'refusal') throw new AIProviderError('A IA recusou o pedido. Tente novamente.')
        if (response.stop_reason === 'max_tokens') {
          throw new AIProviderError('A resposta da IA foi cortada. Tente com uma pasta menor.')
        }
        if (!response.parsed_output) throw new AIProviderError('A IA devolveu uma resposta inválida.')
        return response.parsed_output
      } catch (err) {
        if (err instanceof Anthropic.AuthenticationError) {
          throw new AIProviderError('Chave da API inválida. Confira a chave e tente de novo.')
        }
        if (err instanceof Anthropic.RateLimitError) {
          throw new AIProviderError('Limite de uso da API atingido. Espere um pouco e tente de novo.')
        }
        if (err instanceof Anthropic.APIConnectionError) {
          throw new AIProviderError('Não foi possível conectar à API da Anthropic. Verifique sua internet.')
        }
        throw err
      }
    },
  }
}
