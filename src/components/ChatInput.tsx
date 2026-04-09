'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useChatStore } from '@/store/chat'

const MAX_CHARS = 1000

interface ChatInputProps {
  onSend: (message: string) => void
}

export default function ChatInput({ onSend }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { isStreaming, autoVoiceMode, autoVoiceDelay, setAutoVoiceMode, setAutoVoiceDelay } = useChatStore()
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<any>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingTranscriptRef = useRef('')
  const [showVoiceSettings, setShowVoiceSettings] = useState(false)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [message])

  // Auto-send after silence in auto-voice mode
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (autoVoiceMode && pendingTranscriptRef.current.trim()) {
      silenceTimerRef.current = setTimeout(() => {
        const text = pendingTranscriptRef.current.trim()
        if (text && !isStreaming) {
          onSend(text)
          setMessage('')
          pendingTranscriptRef.current = ''
          // Stop recognition – it will restart after TTS plays
          recognitionRef.current?.stop()
          setIsRecording(false)
        }
      }, autoVoiceDelay * 1000)
    }
  }, [autoVoiceMode, autoVoiceDelay, isStreaming, onSend])

  const handleSubmit = () => {
    if (!message.trim() || isStreaming || message.length > MAX_CHARS) return
    onSend(message.trim())
    setMessage('')
    pendingTranscriptRef.current = ''
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

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Trình duyệt không hỗ trợ nhận diện giọng nói. Vui lòng dùng Chrome.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'vi-VN'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      const clipped = transcript.slice(0, MAX_CHARS)
      setMessage(clipped)
      pendingTranscriptRef.current = clipped
      resetSilenceTimer()
    }

    recognition.onerror = () => {
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }, [resetSilenceTimer])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }
    startRecording()
  }, [isRecording, startRecording])

  // Start listening automatically when auto-voice mode is enabled
  useEffect(() => {
    if (autoVoiceMode && !isRecording && !isStreaming) {
      startRecording()
    }
    if (!autoVoiceMode && isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoVoiceMode])

  // Expose startRecording on window for chat page to call after TTS ends
  useEffect(() => {
    (window as any).__startVoiceRecording = startRecording
    return () => { delete (window as any).__startVoiceRecording }
  }, [startRecording])

  // Clean up silence timer
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    }
  }, [])

  return (
    <div className="chat-input-area" data-tour="chat-input">
      <div className="chat-input-wrapper">
        {/* Mic button */}
        <button
          className="mic-btn"
          data-tour="mic-btn"
          onClick={toggleRecording}
          disabled={isStreaming}
          title={isRecording ? 'Dừng ghi âm' : 'Nhập bằng giọng nói'}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: isRecording ? 'rgba(239,68,68,0.3)' : 'transparent',
            color: isRecording ? '#ef4444' : 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.15s',
            animation: isRecording ? 'pulse 1.5s infinite' : 'none',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </button>

        {/* Auto-voice toggle */}
        <button
          onClick={() => setShowVoiceSettings(v => !v)}
          title="Chế độ tự động nghe & trả lời"
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: 'none',
            background: autoVoiceMode ? 'rgba(99,102,241,0.3)' : 'transparent',
            color: autoVoiceMode ? '#818cf8' : 'rgba(255,255,255,0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? 'Đang nghe...' : autoVoiceMode ? 'Chế độ tự động bật' : 'Nhập tin nhắn...'}
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

      {/* Auto-voice settings popup */}
      {showVoiceSettings && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 12, marginBottom: 8,
          background: 'rgba(20,24,28,0.97)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
          padding: 16, width: 240, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 50,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Chế độ tự động</span>
            <button
              onClick={() => setAutoVoiceMode(!autoVoiceMode)}
              style={{
                width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                background: autoVoiceMode ? '#6366f1' : 'rgba(255,255,255,0.15)',
                position: 'relative', transition: 'background 0.2s',
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 3,
                left: autoVoiceMode ? 21 : 3,
                transition: 'left 0.2s',
              }} />
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 12, lineHeight: 1.5 }}>
            Tự động nghe → gửi tin nhắn → đọc phản hồi → nghe tiếp
          </p>
          <div>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
              Chờ im lặng: {autoVoiceDelay}s
            </label>
            <input
              type="range"
              min={1}
              max={5}
              step={0.5}
              value={autoVoiceDelay}
              onChange={e => setAutoVoiceDelay(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#6366f1' }}
            />
          </div>
        </div>
      )}

      <div className="char-count">{message.length}/{MAX_CHARS}</div>
    </div>
  )
}
