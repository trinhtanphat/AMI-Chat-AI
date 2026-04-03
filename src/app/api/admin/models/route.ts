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

  const models = await prisma.aiModel.findMany({
    include: { provider: { select: { name: true } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(models)
}

export async function POST(req: NextRequest) {
  const session = await isAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, modelId, providerId, isDefault } = await req.json()

  if (!name || !modelId || !providerId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // If setting as default, unset others
  if (isDefault) {
    await prisma.aiModel.updateMany({ data: { isDefault: false } })
  }

  const model = await prisma.aiModel.create({
    data: { name, modelId, providerId, isDefault: isDefault || false },
  })

  return NextResponse.json(model, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await isAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, name, modelId, isActive, isDefault } = await req.json()

  if (!id) return NextResponse.json({ error: 'Model ID required' }, { status: 400 })

  if (isDefault) {
    await prisma.aiModel.updateMany({ data: { isDefault: false } })
  }

  const data: any = {}
  if (name !== undefined) data.name = name
  if (modelId !== undefined) data.modelId = modelId
  if (isActive !== undefined) data.isActive = isActive
  if (isDefault !== undefined) data.isDefault = isDefault

  const model = await prisma.aiModel.update({ where: { id }, data })

  return NextResponse.json(model)
}

export async function DELETE(req: NextRequest) {
  const session = await isAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Model ID required' }, { status: 400 })

  await prisma.aiModel.delete({ where: { id } })

  return NextResponse.json({ message: 'Deleted' })
}
