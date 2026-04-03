import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { streamChatCompletion } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { message, conversationId, modelId } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    let convId = conversationId

    // Create conversation if not exists
    if (!convId) {
      const conversation = await prisma.conversation.create({
        data: {
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          userId: session.user.id,
          modelId,
        },
      })
      convId = conversation.id
    }

    // Verify conversation belongs to user
    const conversation = await prisma.conversation.findFirst({
      where: { id: convId, userId: session.user.id },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Save user message
    await prisma.message.create({
      data: {
        role: 'user',
        content: message,
        conversationId: convId,
        userId: session.user.id,
      },
    })

    // Get conversation history
    const history = await prisma.message.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    })

    const messages = history.map((m) => ({ role: m.role, content: m.content }))

    // Stream response from AI
    const stream = await streamChatCompletion(messages, modelId || conversation.modelId || undefined)

    if (!stream) {
      throw new Error('No response stream from AI')
    }

    // Create a TransformStream to collect the full response
    let fullResponse = ''
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true })
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              // Save assistant message
              if (fullResponse) {
                await prisma.message.create({
                  data: {
                    role: 'assistant',
                    content: fullResponse,
                    conversationId: convId,
                  },
                })

                // Update conversation title if it's the first exchange
                if (history.length <= 1) {
                  await prisma.conversation.update({
                    where: { id: convId },
                    data: {
                      title: message.substring(0, 80) + (message.length > 80 ? '...' : ''),
                      updatedAt: new Date(),
                    },
                  })
                }
              }
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
              return
            }

            try {
              const json = JSON.parse(data)
              const content = json.choices?.[0]?.delta?.content || ''
              if (content) {
                fullResponse += content
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content, conversationId: convId })}\n\n`)
                )
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      },
    })

    const readableStream = (stream as ReadableStream).pipeThrough(transformStream)

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
