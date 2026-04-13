import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { checkRateLimit, RATE_LIMITS, getRateLimitHeaders } from '@/lib/rate-limit'
import { isValidEmail, validatePassword } from '@/lib/sanitize'
import crypto from 'crypto'

// POST - request password reset (generates token)
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const rl = checkRateLimit(`reset:${ip}`, RATE_LIMITS.auth)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Quá nhiều yêu cầu. Vui lòng chờ.' },
      { status: 429, headers: getRateLimitHeaders(rl.remaining, rl.resetAt) }
    )
  }

  const { email } = await req.json()

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  // Always return success to prevent email enumeration
  if (!user) {
    return NextResponse.json({ message: 'Nếu email tồn tại, token đặt lại mật khẩu đã được tạo.' })
  }

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  // Invalidate any existing tokens
  await prisma.passwordReset.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  })

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  })

  // In production, send this token via email
  // For development, log token server-side only
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] Password reset token for ${email}: ${token}`)
  }

  return NextResponse.json({
    message: 'Nếu email tồn tại, token đặt lại mật khẩu đã được tạo.',
  })
}

// PUT - reset password with token
export async function PUT(req: NextRequest) {
  const { token, newPassword } = await req.json()

  if (!token || !newPassword) {
    return NextResponse.json({ error: 'Token và mật khẩu mới là bắt buộc' }, { status: 400 })
  }

  const validation = validatePassword(newPassword)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.message }, { status: 400 })
  }

  const resetEntry = await prisma.passwordReset.findFirst({
    where: {
      token,
      used: false,
      expiresAt: { gt: new Date() },
    },
  })

  if (!resetEntry) {
    return NextResponse.json({ error: 'Token không hợp lệ hoặc đã hết hạn' }, { status: 400 })
  }

  const hashedPassword = await hash(newPassword, 12)

  await prisma.user.update({
    where: { id: resetEntry.userId },
    data: { password: hashedPassword },
  })

  await prisma.passwordReset.update({
    where: { id: resetEntry.id },
    data: { used: true },
  })

  return NextResponse.json({ message: 'Mật khẩu đã được đặt lại thành công.' })
}
