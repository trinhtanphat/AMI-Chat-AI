import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user?.role === 'admin' ? session : null
}

export async function POST(req: NextRequest) {
  const session = await isAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { providerId } = await req.json()
  if (!providerId) return NextResponse.json({ error: 'Provider ID required' }, { status: 400 })

  const provider = await prisma.aiProvider.findUnique({ where: { id: providerId } })
  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

  try {
    const response = await fetch(`${provider.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json(
        { error: `API returned ${response.status}: ${text.substring(0, 200)}` },
        { status: 502 }
      )
    }

    const data = await response.json()
    const models = Array.isArray(data) ? data : (data.data || [])

    const modelList = models.map((m: any) => ({
      id: m.id || m.model || '',
      name: m.id || m.model || m.name || 'Unknown',
      owned_by: m.owned_by || '',
    })).filter((m: any) => m.id)

    return NextResponse.json({ models: modelList })
  } catch (err: any) {
    return NextResponse.json(
      { error: `Không thể kết nối: ${err.message}` },
      { status: 502 }
    )
  }
}

// Auto-add discovered models to the provider
export async function PUT(req: NextRequest) {
  const session = await isAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { providerId, models } = await req.json()
  if (!providerId || !Array.isArray(models)) {
    return NextResponse.json({ error: 'Missing providerId or models' }, { status: 400 })
  }

  const provider = await prisma.aiProvider.findUnique({
    where: { id: providerId },
    include: { models: true },
  })
  if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

  const existingIds = new Set(provider.models.map((m) => m.modelId))
  const toAdd = models.filter((m: { id: string; name: string }) => !existingIds.has(m.id))

  const created = []
  for (const m of toAdd) {
    const model = await prisma.aiModel.create({
      data: {
        name: m.name || m.id,
        modelId: m.id,
        providerId,
        isActive: true,
        isDefault: false,
      },
    })
    created.push(model)
  }

  return NextResponse.json({ added: created.length, models: created })
}
