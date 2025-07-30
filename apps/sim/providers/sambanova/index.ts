import OpenAI from 'openai'
import { env } from '@/lib/env'
import { createLogger } from '@/lib/logs/console/logger'
import type { ModelsObject } from '@/providers/ollama/types'
import type {
  ProviderConfig,
  ProviderRequest,
  ProviderResponse,
  TimeSegment,
} from '@/providers/types'
import { useOllamaStore } from '@/stores/ollama/store'
import { executeTool } from '@/tools'
import { normalizeModelName } from '@/providers/utils'

const logger = createLogger('SambaNovaProvider')
const DEFAULT_ENDPOINT = 'https://api.sambanova.ai'

export const sambanovaProvider: ProviderConfig = {
    id: 'sambanova',
    name: 'SambaNova',
    description: 'SambaNova API models',
    version: '1.0.0',
    models: [],                           // will be populated in initialize()
    defaultModel: '',                     // same
  // Initialize the provider by fetching available models
  /** Fetch live model list from SambaNova and cache in-memory. */
  async initialize() {
    // Avoid running in the browser
    if (typeof window !== 'undefined') return

    const endpoint = process.env.SAMBANOVA_API_ENDPOINT ?? DEFAULT_ENDPOINT
    const apiKey   = process.env.SAMBANOVA_API_KEY!

    try {
      const client = new OpenAI({
        apiKey,
        baseURL: `${endpoint}/v1`,
      })
      const res = await client.models.list()    // assumes the OpenAI client’s /models route works
      const data = res as unknown as ModelsObject

      // Replace with whatever the API actually returns:
      this.models = data.models.map((m) => m.model)
      this.defaultModel = this.models[0] || ''

      logger.info('Fetched SambaNova models', { count: this.models.length })
    } catch (err) {
      logger.error('Failed to fetch SambaNova models', {
        error: err instanceof Error ? err.message : err,
      })
    }
  },

  executeRequest: async (
    request: ProviderRequest
  ): Promise<ProviderResponse> => {
    logger.info('Preparing SambaNova request', {
      model: request.model,
      hasSystemPrompt: !!request.systemPrompt,
      hasMessages: !!request.context,
      hasTools: !!request.tools?.length,
      toolCount: request.tools?.length || 0,
      hasResponseFormat: !!request.responseFormat,
    })
  
    const startTime = Date.now()
  
    // --- SETUP THE SAMBANOVA CLIENT WITH YOUR KEY & ENDPOINT ---
    const endpoint =
      process.env.SAMBANOVA_API_ENDPOINT ??
      DEFAULT_ENDPOINT
  
    const apiKey =
      process.env.SAMBANOVA_API_KEY
  
    if (!apiKey) {
      throw new Error('SambaNova API key is required for sambanovaProvider')
    }
  
    const client = new OpenAI({
      apiKey,
      baseURL: `${endpoint}/v1`,
    })
  
    // --- BUILD YOUR CHAT PAYLOAD ---
    const allMessages: any[] = []
    if (request.systemPrompt) allMessages.push({ role: 'system', content: request.systemPrompt })
    if (request.context)     allMessages.push({ role: 'user',   content: request.context })
    if (request.messages)    allMessages.push(...request.messages)
  
    const originalModel = normalizeModelName(request.model)
  
    const payload: any = {
      model: originalModel,
      messages: allMessages,
    }
    if (request.temperature !== undefined) payload.temperature = request.temperature
    if (request.maxTokens    !== undefined) payload.max_tokens  = request.maxTokens
  
    // --- OPTIONALLY ADD FUNCTIONS/TOOLS ---
    const functions = request.tools?.map((tool) => ({
      name: tool.id,
      description: tool.description,
      parameters: tool.parameters,
    }))
    if (functions?.length) {
      payload.functions   = functions
      payload.tool_choice = 'auto'
    }
  
    // --- MAKE THE REQUEST ---
    const response = await client.chat.completions.create(payload)
  
    // --- EXTRACT YOUR RESULTS ---
    const content = response.choices[0]?.message?.content ?? ''
    const usage   = (response.usage || {}) as any
  
    return {
      content,
      model: request.model,
      tokens: {
        prompt:     usage.prompt_tokens    || 0,
        completion: usage.completion_tokens || 0,
        total:      usage.total_tokens      || 0,
      },
    }
  }
  ,
}
