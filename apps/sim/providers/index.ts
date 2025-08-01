import { createLogger } from '@/lib/logs/console/logger'
import type { StreamingExecution } from '@/executor/types'
import type { ProviderRequest, ProviderResponse } from '@/providers/types'
import {
  calculateCost,
  generateStructuredOutputInstructions,
  getProvider,
  supportsTemperature,
} from '@/providers/utils'

const logger = createLogger('Providers')

// Sanitize the request by removing parameters that aren't supported by the model
function sanitizeRequest(request: ProviderRequest): ProviderRequest {
  const sanitizedRequest = { ...request }

  if (sanitizedRequest.model && !supportsTemperature(sanitizedRequest.model)) {
    sanitizedRequest.temperature = undefined
  }

  return sanitizedRequest
}

function isStreamingExecution(response: any): response is StreamingExecution {
  return response && typeof response === 'object' && 'stream' in response && 'execution' in response
}

function isReadableStream(response: any): response is ReadableStream {
  return response instanceof ReadableStream
}

export async function executeProviderRequest(
  providerId: string,
  request: ProviderRequest
): Promise<ProviderResponse | ReadableStream | StreamingExecution> {
  logger.info(`Executing request with provider: ${providerId}`, {
    hasResponseFormat: !!request.responseFormat,
    model: request.model,
  })

  const provider = getProvider(providerId)
  if (!provider) {
    throw new Error(`Provider not found: ${providerId}`)
  }

  if (!provider.executeRequest) {
    throw new Error(`Provider ${providerId} does not implement executeRequest`)
  }
  const sanitizedRequest = sanitizeRequest(request)

  // If responseFormat is provided, modify the system prompt to enforce structured output
  if (sanitizedRequest.responseFormat) {
    if (
      typeof sanitizedRequest.responseFormat === 'string' &&
      sanitizedRequest.responseFormat === ''
    ) {
      logger.info('Empty response format provided, ignoring it')
      sanitizedRequest.responseFormat = undefined
    } else {
      // Generate structured output instructions
      const structuredOutputInstructions = generateStructuredOutputInstructions(
        sanitizedRequest.responseFormat
      )

      // Only add additional instructions if they're not empty
      if (structuredOutputInstructions.trim()) {
        const originalPrompt = sanitizedRequest.systemPrompt || ''
        sanitizedRequest.systemPrompt =
          `${originalPrompt}\n\n${structuredOutputInstructions}`.trim()

        logger.info('Added structured output instructions to system prompt')
      }
    }
  }

  // Execute the request using the provider's implementation
  const response = await provider.executeRequest(sanitizedRequest)

  // If we received a StreamingExecution or ReadableStream, just pass it through
  if (isStreamingExecution(response)) {
    logger.info('Provider returned StreamingExecution')
    return response
  }

  if (isReadableStream(response)) {
    logger.info('Provider returned ReadableStream')
    return response
  }

  // At this point, we know we have a ProviderResponse
  logger.info('Provider response received', {
    contentLength: response.content ? response.content.length : 0,
    model: response.model,
    hasTokens: !!response.tokens,
    hasToolCalls: !!response.toolCalls,
    toolCallsCount: response.toolCalls?.length || 0,
  })

  // Calculate cost based on token usage if tokens are available
  if (response.tokens) {
    const { prompt: promptTokens = 0, completion: completionTokens = 0 } = response.tokens
    const useCachedInput = !!request.context && request.context.length > 0

    response.cost = calculateCost(response.model, promptTokens, completionTokens, useCachedInput)
  }

  return response
}
