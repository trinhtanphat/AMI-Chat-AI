import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

  for (const [key, value] of Object.entries(settings)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })
  }

  return NextResponse.json({ message: 'Settings updated' })
}
