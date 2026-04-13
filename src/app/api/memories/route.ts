import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeMessage } from '@/lib/sanitize'
import { checkRateLimit, RATE_LIMITS, getRateLimitHeaders } from '@/lib/rate-limit'

const MAX_MEMORIES_PER_USER = 100

// GET - list user's memories
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const memories = await prisma.memory.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    take: MAX_MEMORIES_PER_USER,
  })

  return NextResponse.json(memories)
}

// POST - add a new memory
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = checkRateLimit(`memory:post:${session.user.id}`, RATE_LIMITS.general)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: getRateLimitHeaders(rl.remaining, rl.resetAt) }
    )
  }

  const { content, type } = await req.json()
  const sanitized = sanitizeMessage(content)
  if (!sanitized || sanitized.length > 2000) {
    return NextResponse.json({ error: 'Content is required and must be under 2000 characters' }, { status: 400 })
  }

  const validTypes = ['fact', 'preference', 'context']
  const safeType = validTypes.includes(type) ? type : 'fact'

  // Check memory limit per user
  const count = await prisma.memory.count({ where: { userId: session.user.id } })
  if (count >= MAX_MEMORIES_PER_USER) {
    return NextResponse.json({ error: 'Memory limit reached' }, { status: 400 })
  }

  const memory = await prisma.memory.create({
    data: {
      userId: session.user.id,
      type: safeType,
      content: sanitized,
    },
  })

  return NextResponse.json(memory, { status: 201 })
}

// DELETE - delete a memory
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id) {
    return NextResponse.json({ error: 'Memory ID is required' }, { status: 400 })
  }

  const memory = await prisma.memory.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!memory) {
    return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
  }

  await prisma.memory.delete({ where: { id } })

  return NextResponse.json({ message: 'Deleted' })
}
