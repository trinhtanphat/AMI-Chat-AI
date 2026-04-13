import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hash, compare } from 'bcryptjs'
import { sanitizeMessage, validatePassword } from '@/lib/sanitize'
import { checkRateLimit, RATE_LIMITS, getRateLimitHeaders } from '@/lib/rate-limit'

// GET - get current user profile
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      bio: true,
      language: true,
      customPrompt: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          conversations: true,
          messages: true,
        },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(user)
}

// PATCH - update user profile
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = checkRateLimit(`profile:${session.user.id}`, RATE_LIMITS.general)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: getRateLimitHeaders(rl.remaining, rl.resetAt) }
    )
  }

  const body = await req.json()
  const { name, bio, language, customPrompt, currentPassword, newPassword } = body

  const data: any = {}

  if (name !== undefined) {
    const sanitized = sanitizeMessage(name).slice(0, 100)
    if (!sanitized) {
      return NextResponse.json({ error: 'Tên không hợp lệ' }, { status: 400 })
    }
    data.name = sanitized
  }

  if (bio !== undefined) {
    data.bio = sanitizeMessage(bio).slice(0, 500)
  }

  if (language !== undefined && ['vi', 'en'].includes(language)) {
    data.language = language
  }

  if (customPrompt !== undefined) {
    data.customPrompt = sanitizeMessage(customPrompt).slice(0, 2000)
  }

  // Password change
  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'Vui lòng nhập mật khẩu hiện tại' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isValid = await compare(currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 400 })
    }

    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.message }, { status: 400 })
    }

    data.password = await hash(newPassword, 12)
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      bio: true,
      language: true,
      customPrompt: true,
      role: true,
    },
  })

  return NextResponse.json(updated)
}
