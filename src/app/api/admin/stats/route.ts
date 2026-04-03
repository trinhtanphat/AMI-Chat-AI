import { NextResponse } from 'next/server'
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

  const [userCount, conversationCount, messageCount, activeProviders] = await Promise.all([
    prisma.user.count(),
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.aiProvider.count({ where: { isActive: true } }),
  ])

  const recentUsers = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, email: true, createdAt: true },
  })

  return NextResponse.json({
    userCount,
    conversationCount,
    messageCount,
    activeProviders,
    recentUsers,
  })
}
