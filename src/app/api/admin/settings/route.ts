import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ALLOWED_SETTINGS = new Set([
  'site_name',
  'site_description',
  'default_system_prompt',
  'max_messages_per_conversation',
  'allow_registration',
  'tts_provider_id',
  'tts_model',
  'tts_voice',
  'tts_speed',
])
const MAX_VALUE_LENGTH = 5000

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user?.role === 'admin' ? session : null
}

export async function GET() {
  const session = await isAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const settings = await prisma.systemSetting.findMany()
  const settingsMap: Record<string, string> = {}
  settings.forEach((s) => (settingsMap[s.key] = s.value))

  return NextResponse.json(settingsMap)
}

export async function PUT(req: NextRequest) {
  const session = await isAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const settings = await req.json()
  if (!settings || typeof settings !== 'object') {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  for (const [key, value] of Object.entries(settings)) {
    if (!ALLOWED_SETTINGS.has(key)) continue
    const strValue = String(value).slice(0, MAX_VALUE_LENGTH)
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: strValue },
      create: { key, value: strValue },
    })
  }

  return NextResponse.json({ message: 'Settings updated' })
}
