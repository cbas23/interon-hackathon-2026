import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'

let model: LanguageModel | undefined

export class AiConfigurationError extends Error {
  constructor() {
    super('OPENROUTER_API_KEY is required to use the AI model.')
    this.name = 'AiConfigurationError'
  }
}

export function getAiModel() {
  if (model) {
    return model
  }

  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    throw new AiConfigurationError()
  }

  const openrouter = createOpenRouter({
    apiKey,
    compatibility: 'strict',
  })

  model = openrouter('openai/gpt-oss-120b:nitro')
  return model
}
