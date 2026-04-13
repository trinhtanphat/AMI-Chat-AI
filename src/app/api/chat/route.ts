import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { streamChatCompletion } from '@/lib/ai'
import { checkRateLimit, RATE_LIMITS, getRateLimitHeaders } from '@/lib/rate-limit'
import { sanitizeMessage } from '@/lib/sanitize'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting
  const rl = checkRateLimit(`chat:${session.user.id}`, RATE_LIMITS.chat)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Quá nhiều yêu cầu. Vui lòng chờ một chút.' },
      { status: 429, headers: getRateLimitHeaders(rl.remaining, rl.resetAt) }
    )
  }

  try {
    const { message, conversationId, modelId } = await req.json()

    const sanitizedMessage = sanitizeMessage(message)
    if (!sanitizedMessage) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    let convId = conversationId

    // Create conversation if not exists
    if (!convId) {
      const conversation = await prisma.conversation.create({
        data: {
          title: sanitizedMessage.substring(0, 50) + (sanitizedMessage.length > 50 ? '...' : ''),
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
        content: sanitizedMessage,
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

    // Load context in parallel for better performance
    const [userMemories, character, user] = await Promise.all([
      prisma.memory.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      conversation.characterId
        ? prisma.live2DCharacter.findUnique({ where: { id: conversation.characterId } })
        : null,
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { customPrompt: true },
      }),
    ])

    const characterPrompt = character?.personality || undefined

    // Stream response from AI with memory and personality context
    const stream = await streamChatCompletion(
      messages,
      modelId || conversation.modelId || undefined,
      {
        memories: userMemories.map(m => m.content),
        characterPrompt,
        userPrompt: user?.customPrompt || undefined,
      }
    )

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
                      title: sanitizedMessage.substring(0, 80) + (sanitizedMessage.length > 80 ? '...' : ''),
                      updatedAt: new Date(),
                    },
                  })
                }

                // Extract and save memory facts from the conversation
                try {
                  await extractAndSaveMemories(session.user.id, sanitizedMessage, fullResponse)
                } catch {
                  // Non-critical: don't fail the request
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
    const msg = error.message || 'Internal server error'
    // Map known error patterns to proper status codes
    const status = msg.includes('hết credit') || msg.includes('402') ? 402
      : msg.includes('API key') || msg.includes('401') ? 401
      : msg.includes('Quá nhiều') || msg.includes('429') ? 429
      : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

/**
 * Extract useful facts from conversation and save as memories
 * Inspired by airi's memory system
 */
async function extractAndSaveMemories(userId: string, userMessage: string, aiResponse: string) {
  // Simple fact extraction patterns
  const patterns = [
    // User self-introduction: "tôi là ...", "tên tôi là ..."
    /(?:tôi là|tên tôi là|my name is|i am|i'm)\s+([^,.!?]+)/i,
    // Preferences: "tôi thích ...", "i like ..."
    /(?:tôi thích|tôi yêu thích|i like|i love|i prefer)\s+([^,.!?]+)/i,
    // Location: "tôi ở ...", "i live in ..."
    /(?:tôi ở|tôi sống ở|i live in|i'm from|i am from)\s+([^,.!?]+)/i,
    // Job: "tôi làm ...", "i work as ..."
    /(?:tôi làm|công việc của tôi|i work as|my job is|i'm a)\s+([^,.!?]+)/i,
  ]

  for (const pattern of patterns) {
    const match = userMessage.match(pattern)
    if (match?.[1]) {
      const fact = match[0].trim()
      // Check for duplicate
      const existing = await prisma.memory.findFirst({
        where: { userId, content: { contains: fact.substring(0, 50) } },
      })
      if (!existing) {
        await prisma.memory.create({
          data: {
            userId,
            type: 'fact',
            content: fact,
          },
        })
      }
    }
  }
}
