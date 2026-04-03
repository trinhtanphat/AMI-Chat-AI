import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { text } = await req.json()
  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 })
  }

  // Limit text length to prevent abuse
  const trimmed = text.slice(0, 2000)

  // Get TTS settings from SystemSetting
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ['tts_provider_id', 'tts_model', 'tts_voice', 'tts_speed'] } },
  })
  const settingsMap: Record<string, string> = {}
  settings.forEach((s) => (settingsMap[s.key] = s.value))

  const ttsProviderId = settingsMap.tts_provider_id
  const ttsModel = settingsMap.tts_model || 'tts-1'
  const ttsVoice = settingsMap.tts_voice || 'nova'
  const ttsSpeed = parseFloat(settingsMap.tts_speed || '1.0')

  // If no TTS provider configured, try to use the active provider
  let provider
  if (ttsProviderId) {
    provider = await prisma.aiProvider.findUnique({ where: { id: ttsProviderId } })
  }
  if (!provider) {
    provider = await prisma.aiProvider.findFirst({ where: { isActive: true } })
  }

  if (!provider) {
    return NextResponse.json(
      { error: 'Chưa cài đặt TTS provider. Vào Admin > Cài đặt để cấu hình.' },
      { status: 400 }
    )
  }

  try {
    const response = await fetch(`${provider.baseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: ttsModel,
        input: trimmed,
        voice: ttsVoice,
        speed: ttsSpeed,
        response_format: 'mp3',
      }),
    })

    if (!response.ok) {
      console.error('TTS API error:', response.status, await response.text())
      return NextResponse.json(
        { error: 'Dịch vụ giọng nói tạm thời không khả dụng.' },
        { status: 502 }
      )
    }

    const audioBuffer = await response.arrayBuffer()

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err: any) {
    console.error('TTS connection error:', err.message)
    return NextResponse.json(
      { error: 'Không thể kết nối dịch vụ giọng nói.' },
      { status: 502 }
    )
  }
}
