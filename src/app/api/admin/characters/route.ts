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

  const characters = await prisma.live2DCharacter.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(characters)
}

export async function POST(req: NextRequest) {
  const session = await isAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, modelUrl, thumbnail, category, isDefault, sortOrder } = await req.json()

  if (!name || !modelUrl) {
    return NextResponse.json({ error: 'Tên và URL model là bắt buộc' }, { status: 400 })
  }

  if (isDefault) {
    await prisma.live2DCharacter.updateMany({ data: { isDefault: false } })
  }

  const character = await prisma.live2DCharacter.create({
    data: {
      name,
      modelUrl,
      thumbnail: thumbnail || null,
      category: category || 'default',
      isDefault: isDefault || false,
      sortOrder: sortOrder || 0,
    },
  })

  return NextResponse.json(character, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await isAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, name, modelUrl, thumbnail, category, isActive, isDefault, sortOrder } = await req.json()

  if (!id) return NextResponse.json({ error: 'ID là bắt buộc' }, { status: 400 })

  if (isDefault) {
    await prisma.live2DCharacter.updateMany({ data: { isDefault: false } })
  }

  const data: any = {}
  if (name !== undefined) data.name = name
  if (modelUrl !== undefined) data.modelUrl = modelUrl
  if (thumbnail !== undefined) data.thumbnail = thumbnail
  if (category !== undefined) data.category = category
  if (isActive !== undefined) data.isActive = isActive
  if (isDefault !== undefined) data.isDefault = isDefault
  if (sortOrder !== undefined) data.sortOrder = sortOrder

  const character = await prisma.live2DCharacter.update({ where: { id }, data })

  return NextResponse.json(character)
}

export async function DELETE(req: NextRequest) {
  const session = await isAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID là bắt buộc' }, { status: 400 })

  await prisma.live2DCharacter.delete({ where: { id } })

  return NextResponse.json({ message: 'Đã xóa' })
}
