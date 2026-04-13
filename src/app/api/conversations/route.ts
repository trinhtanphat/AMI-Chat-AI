import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeSearchQuery, sanitizeMessage } from '@/lib/sanitize'
import { checkRateLimit, RATE_LIMITS, getRateLimitHeaders } from '@/lib/rate-limit'

const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 50

// GET - list conversations for current user (with optional search)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams
  const search = sanitizeSearchQuery(searchParams.get('search') || '')
  const pinned = searchParams.get('pinned')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get('limit') || DEFAULT_PAGE_SIZE.toString(), 10)))
  const skip = (page - 1) * pageSize

  const where: any = { userId: session.user.id }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { messages: { some: { content: { contains: search } } } },
    ]
  }

  if (pinned === 'true') {
    where.isPinned = true
  }

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      skip,
      take: pageSize,
    }),
    prisma.conversation.count({ where }),
  ])

  return NextResponse.json({
    data: conversations,
    pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
  })
}

// POST - create new conversation
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = checkRateLimit(`conv:post:${session.user.id}`, RATE_LIMITS.general)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: getRateLimitHeaders(rl.remaining, rl.resetAt) }
    )
  }

  const { title, modelId } = await req.json()
  const sanitizedTitle = title ? sanitizeMessage(title).slice(0, 200) : 'New Chat'

  if (modelId && typeof modelId !== 'string') {
    return NextResponse.json({ error: 'Invalid modelId' }, { status: 400 })
  }

  const conversation = await prisma.conversation.create({
    data: {
      title: sanitizedTitle,
      userId: session.user.id,
      modelId,
    },
  })

  return NextResponse.json(conversation, { status: 201 })
}
