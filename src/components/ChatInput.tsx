'use client'

import { useState, useRef, useEffect } from 'react'
import { useChatStore } from '@/store/chat'

const MAX_CHARS = 1000

interface ChatInputProps {
  onSend: (message: string) => void
}

export default function ChatInput({ onSend }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { isStreaming } = useChatStore()

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [message])

  const handleSubmit = () => {
    if (!message.trim() || isStreaming || message.length > MAX_CHARS) return
    onSend(message.trim())
    setMessage('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    if (val.length <= MAX_CHARS) {
      setMessage(val)
    }
  }

  return (
    <div className="chat-input-area">
      <div className="chat-input-wrapper">
        <textarea
          ref={textareaRef}
          rows={1}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn..."
          disabled={isStreaming}
        />
        <button
          className="send-btn"
          onClick={handleSubmit}
          disabled={!message.trim() || isStreaming}
        >
          {isStreaming ? (
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          )}
        </button>
      </div>
      <div className="char-count">{message.length}/{MAX_CHARS}</div>
    </div>
  )
}
