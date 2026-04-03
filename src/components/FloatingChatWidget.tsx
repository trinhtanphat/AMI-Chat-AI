'use client'

import { useState, useRef, useEffect } from 'react'

interface FloatingChatWidgetProps {
  onSendMessage?: (msg: string) => void
  messages?: { role: 'user' | 'assistant'; content: string }[]
  isStreaming?: boolean
  streamingContent?: string
}

export default function FloatingChatWidget({ onSendMessage, messages = [], isStreaming, streamingContent }: FloatingChatWidgetProps) {
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const recognition = new SR()
    recognition.lang = 'vi-VN'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript
      if (text) {
        setMsg(text)
      }
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  const stopVoice = () => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  const handleSend = () => {
    if (!msg.trim() || isStreaming) return
    onSendMessage?.(msg.trim())
    setMsg('')
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 100,
        width: 56, height: 56, borderRadius: '50%', border: 'none',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: '#fff', cursor: 'pointer',
        boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(99,102,241,0.5)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,0.4)' }}
        title="Mở chat"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 100,
      width: 360, maxWidth: 'calc(100vw - 32px)',
      height: 480, maxHeight: 'calc(100vh - 48px)',
      borderRadius: 16, overflow: 'hidden',
      background: 'rgba(15,15,25,0.95)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>🤖</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>AMI Chat</div>
            <div style={{ fontSize: 10, color: isStreaming ? '#fbbf24' : '#86efac', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isStreaming ? '#fbbf24' : '#86efac' }} />
              {isStreaming ? 'Đang trả lời...' : 'Trực tuyến'}
            </div>
          </div>
        </div>
        <button onClick={() => setOpen(false)} style={{
          width: 28, height: 28, borderRadius: '50%', border: 'none',
          background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && !isStreaming && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, padding: '40px 16px' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>👋</div>
            Xin chào! Hỏi tôi bất cứ điều gì.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%', padding: '8px 12px', borderRadius: 12,
            background: m.role === 'user'
              ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
              : 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 1.5,
            wordBreak: 'break-word',
          }}>
            {m.content}
          </div>
        ))}
        {isStreaming && streamingContent && (
          <div style={{
            alignSelf: 'flex-start', maxWidth: '85%', padding: '8px 12px', borderRadius: 12,
            background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)',
            fontSize: 13, lineHeight: 1.5,
          }}>
            {streamingContent}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'flex-end', gap: 8,
      }}>
        <button onClick={isListening ? stopVoice : startVoice} style={{
          width: 34, height: 34, borderRadius: '50%', border: 'none', flexShrink: 0,
          background: isListening ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)',
          color: isListening ? '#fca5a5' : 'rgba(255,255,255,0.5)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
          animation: isListening ? 'pulse 1.5s infinite' : 'none',
        }}
          onMouseEnter={e => { if (!isListening) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
          onMouseLeave={e => { if (!isListening) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
          title={isListening ? 'Dừng ghi âm' : 'Nói'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </button>
        <textarea
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Nhập tin nhắn..."
          rows={1}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.85)', fontSize: 13, outline: 'none',
            resize: 'none', maxHeight: 80,
            transition: 'border-color 0.15s',
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.4)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
        />
        <button onClick={handleSend} disabled={!msg.trim() || isStreaming} style={{
          width: 34, height: 34, borderRadius: '50%', border: 'none', flexShrink: 0,
          background: msg.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.06)',
          color: msg.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
          cursor: msg.trim() ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
