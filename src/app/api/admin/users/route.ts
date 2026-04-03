import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

async function isAdmin() {
  const session = await getServerSession(authOptions)
  return session?.user?.role === 'admin' ? session : null
}

export async function GET() {
  const session = await isAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: { select: { conversations: true, messages: true } },
    },
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await isAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, name, password, role } = await req.json()

  if (!email || !name || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
  }

  const hashedPassword = await hash(password, 12)
  const user = await prisma.user.create({
    data: { email, name, password: hashedPassword, role: role || 'user' },
  })

  return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await isAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, name, role, isActive, password } = await req.json()

  if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 })

  const data: any = {}
  if (name !== undefined) data.name = name
  if (role !== undefined) data.role = role
  if (isActive !== undefined) data.isActive = isActive
  if (password) data.password = await hash(password, 12)

  const user = await prisma.user.update({ where: { id }, data })

  return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive })
}

export async function DELETE(req: NextRequest) {
  const session = await isAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 })

  // Prevent deleting self
  if (id === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id } })

  return NextResponse.json({ message: 'Deleted' })
}
