import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { email, name, password } = await req.json()

    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 })
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
      data: { email, name, password: hashedPassword },
    })

    return NextResponse.json({ message: 'Đăng ký thành công', userId: user.id }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 })
  }
}
