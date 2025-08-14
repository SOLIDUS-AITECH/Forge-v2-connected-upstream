import { NextResponse } from 'next/server'
import { createLogger } from '@/lib/logs/console/logger'
import { uploadFile } from '@/lib/uploads/storage-client'
import { getBaseUrl } from '@/lib/urls/utils'

const logger = createLogger('ProxyTTSAPI')

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { text, voiceId, apiKey, modelId = 'eleven_monolingual_v1' } = body

    logger.info("Incoming TTS API body", {
      hasApiKey: !!apiKey,
      textLength: text?.length,
      textPreview: text?.slice(0, 50),
      voiceId,
      modelId
    })

    if (!text || !voiceId || !apiKey) {
      logger.error("Missing required parameters", { text, voiceId, hasApiKey: !!apiKey })
      return new NextResponse('Missing required parameters', { status: 400 })
    }

    const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`
    const payload = {
      text,
      model_id: modelId
    }

    logger.info("Sending request to ElevenLabs", { endpoint, payload })

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      logger.error("ElevenLabs returned error", {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      return new NextResponse(`Failed to generate TTS: ${response.status} ${response.statusText}`, {
        status: response.status,
      })
    }

    const audioBlob = await response.blob()
    if (audioBlob.size === 0) {
      logger.error('Empty audio received from ElevenLabs')
      return new NextResponse('Empty audio received', { status: 422 })
    }

    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer())
    const timestamp = Date.now()
    const fileName = `elevenlabs-tts-${timestamp}.mp3`
    const fileInfo = await uploadFile(audioBuffer, fileName, 'audio/mpeg')
    const audioUrl = `${getBaseUrl()}${fileInfo.path}`

    logger.info("Generated TTS successfully", { audioUrl, size: fileInfo.size })

    return NextResponse.json({
      audioUrl,
      size: fileInfo.size,
    })
  } catch (error) {
    logger.error('Error proxying TTS:', error)
    return new NextResponse(
      `Internal Server Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    )
  }
}