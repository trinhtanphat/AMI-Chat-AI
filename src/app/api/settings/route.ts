import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const PUBLIC_SETTINGS = new Set([
  'site_name',
  'site_description',
  'auto_voice_enabled',
  'auto_voice_delay',
])

export async function GET() {
  const settings = await prisma.systemSetting.findMany()
  const result: Record<string, string> = {}
  for (const s of settings) {
    if (PUBLIC_SETTINGS.has(s.key)) {
      result[s.key] = s.value
    }
  }
  return NextResponse.json(result)
}
