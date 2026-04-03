import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import fs from 'fs'
import path from 'path'

export async function POST(req: Request) {
  try {
    const session = await getServerSession()
    const body = await req.json()
    const { name, email, message } = body

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const feedback = {
      id: Date.now().toString(),
      name: typeof name === 'string' ? name.slice(0, 200) : '',
      email: typeof email === 'string' ? email.slice(0, 200) : '',
      message: message.slice(0, 2000),
      user: session?.user?.name || 'anonymous',
      createdAt: new Date().toISOString(),
    }

    const feedbackDir = path.join(process.cwd(), 'data')
    const feedbackFile = path.join(feedbackDir, 'feedback.json')

    if (!fs.existsSync(feedbackDir)) {
      fs.mkdirSync(feedbackDir, { recursive: true })
    }

    let feedbacks: any[] = []
    if (fs.existsSync(feedbackFile)) {
      try {
        feedbacks = JSON.parse(fs.readFileSync(feedbackFile, 'utf-8'))
      } catch {
        feedbacks = []
      }
    }

    feedbacks.push(feedback)
    fs.writeFileSync(feedbackFile, JSON.stringify(feedbacks, null, 2))

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
