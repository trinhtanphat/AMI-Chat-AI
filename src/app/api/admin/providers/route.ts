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

  const providers = await prisma.aiProvider.findMany({
    include: { models: true },
    orderBy: { createdAt: 'desc' },
  })

  // Mask API keys
  const masked = providers.map((p) => ({
    ...p,
    apiKey: p.apiKey.substring(0, 8) + '...' + p.apiKey.substring(p.apiKey.length - 4),
  }))

  return NextResponse.json(masked)
}

export async function POST(req: NextRequest) {
  const session = await isAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, baseUrl, apiKey, models } = await req.json()

  if (!name || !baseUrl || !apiKey) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const provider = await prisma.aiProvider.create({
    data: {
      name,
      baseUrl,
      apiKey,
      isActive: true,
      models: models?.length
        ? {
            create: models.map((m: { name: string; modelId: string }) => ({
              name: m.name,
              modelId: m.modelId,
            })),
          }
        : undefined,
    },
    include: { models: true },
  })

  return NextResponse.json(provider, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await isAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, name, baseUrl, apiKey, isActive } = await req.json()

  if (!id) return NextResponse.json({ error: 'Provider ID required' }, { status: 400 })

  const data: any = {}
  if (name !== undefined) data.name = name
  if (baseUrl !== undefined) data.baseUrl = baseUrl
  if (apiKey !== undefined) data.apiKey = apiKey
  if (isActive !== undefined) data.isActive = isActive

  const provider = await prisma.aiProvider.update({ where: { id }, data })

  return NextResponse.json(provider)
}

export async function DELETE(req: NextRequest) {
  const session = await isAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Provider ID required' }, { status: 400 })

  await prisma.aiProvider.delete({ where: { id } })

  return NextResponse.json({ message: 'Deleted' })
}
