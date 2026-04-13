import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, RATE_LIMITS, getRateLimitHeaders } from '@/lib/rate-limit'

// GET - export conversation as JSON
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting
  const rl = checkRateLimit(`export:${session.user.id}`, RATE_LIMITS.export)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Quá nhiều yêu cầu xuất. Vui lòng chờ.' },
      { status: 429, headers: getRateLimitHeaders(rl.remaining, rl.resetAt) }
    )
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const format = req.nextUrl.searchParams.get('format') || 'json'

  if (format === 'markdown') {
    const md = generateMarkdown(conversation)
    return new Response(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="chat-${conversation.id}.md"`,
      },
    })
  }

  // Default: JSON export
  const exportData = {
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: conversation.messages.length,
    messages: conversation.messages.map(m => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  }

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="chat-${conversation.id}.json"`,
    },
  })
}

function generateMarkdown(conversation: any): string {
  let md = `# ${conversation.title}\n\n`
  md += `*Exported on ${new Date().toISOString()}*\n\n---\n\n`

  for (const msg of conversation.messages) {
    const role = msg.role === 'user' ? '👤 User' : msg.role === 'assistant' ? '🤖 AMI' : '⚙️ System'
    const time = new Date(msg.createdAt).toLocaleString('vi-VN')
    md += `### ${role} — ${time}\n\n${msg.content}\n\n---\n\n`
  }

  return md
}
