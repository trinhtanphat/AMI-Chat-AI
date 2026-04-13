import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, RATE_LIMITS, getRateLimitHeaders } from '@/lib/rate-limit'
import { isValidEmail, validatePassword, sanitizeMessage } from '@/lib/sanitize'

export async function POST(req: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const rl = checkRateLimit(`register:${ip}`, RATE_LIMITS.register)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau.' },
        { status: 429, headers: getRateLimitHeaders(rl.remaining, rl.resetAt) }
      )
    }

    const { email, name, password } = await req.json()

    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin' }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 })
    }

    const sanitizedName = sanitizeMessage(name).slice(0, 100)
    if (!sanitizedName) {
      return NextResponse.json({ error: 'Tên không hợp lệ' }, { status: 400 })
    }

    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.message }, { status: 400 })
    }

    // Check registration allowed
    const regSetting = await prisma.systemSetting.findUnique({ where: { key: 'allow_registration' } })
    if (regSetting?.value === 'false') {
      return NextResponse.json({ error: 'Đăng ký đã bị tắt bởi quản trị viên' }, { status: 403 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 409 })
    }

    const hashedPassword = await hash(password, 12)
    const user = await prisma.user.create({
      data: { email, name: sanitizedName, password: hashedPassword },
    })

    return NextResponse.json({ message: 'Đăng ký thành công', userId: user.id }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
