'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ChatMessage from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import Live2DCharacter, { type Live2DCharacterHandle } from '@/components/Live2DCharacter'
import VRMCharacter, { type VRMCharacterHandle } from '@/components/VRMCharacter'
import SettingsPanel from '@/components/SettingsPanel'
import { useChatStore } from '@/store/chat'

interface Live2DChar {
  id: string
  name: string
  modelUrl: string
  thumbnail: string | null
  category: string
  isDefault: boolean
}

const BACKGROUNDS = [
  { id: 'cherry-blossom', src: '/assets/backgrounds/cherry-blossom.jpg', label: 'Hoa anh đào' },
  { id: 'night-city', src: '/assets/backgrounds/night-city.jpg', label: 'Phố đêm Tokyo' },
  { id: 'mountain-lake', src: '/assets/backgrounds/mountain-lake.jpg', label: 'Núi mây' },
  { id: 'starry-night', src: '/assets/backgrounds/starry-night.jpg', label: 'Đêm sao' },
  { id: 'sunset-ocean', src: '/assets/backgrounds/sunset-ocean.jpg', label: 'Hoàng hôn' },
  { id: 'neon-street', src: '/assets/backgrounds/neon-street.jpg', label: 'Skyline' },
  { id: 'anime-room', src: '/assets/backgrounds/anime-room.jpg', label: 'Gradient' },
  { id: 'campus-green', src: '/assets/backgrounds/campus-green.jpg', label: 'Khuôn viên' },
]

export default function ChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const live2dRef = useRef<Live2DCharacterHandle>(null)
  const vrmRef = useRef<VRMCharacterHandle>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [bgIndex, setBgIndex] = useState(0)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showBgSelector, setShowBgSelector] = useState(false)
  const [showCharSelector, setShowCharSelector] = useState(false)
  const [showExprPanel, setShowExprPanel] = useState(false)
  const [modelExpressions, setModelExpressions] = useState<string[]>([])
  const [modelMotionGroups, setModelMotionGroups] = useState<{ name: string; count: number }[]>([])
  const [models, setModels] = useState<any[]>([])
  const [characters, setCharacters] = useState<Live2DChar[]>([])
  const [selectedCharUrl, setSelectedCharUrl] = useState<string | undefined>(undefined)
  const is3D = selectedCharUrl?.endsWith('.vrm') || selectedCharUrl?.endsWith('.glb') || false
  const isVRM = is3D
  const [charKey, setCharKey] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [followCursor, setFollowCursor] = useState(true)
  const [scrollZoom, setScrollZoom] = useState(true)
  const [charSearch, setCharSearch] = useState('')
  const {
    messages,
    currentConversationId,
    isStreaming,
    streamingContent,
    selectedModelId,
    setSelectedModelId,
    setCurrentConversation,
    setMessages,
    addMessage,
    setIsStreaming,
    setStreamingContent,
    conversations,
    setConversations,
    removeConversation,
    autoVoiceMode,
  } = useChatStore()

  useEffect(() => {
    fetch('/api/settings').then(r => r.ok ? r.json() : {}).then((s: Record<string, string>) => {
      if (s.auto_voice_enabled === 'true') useChatStore.getState().setAutoVoiceMode(true)
      if (s.auto_voice_delay) useChatStore.getState().setAutoVoiceDelay(Number(s.auto_voice_delay) || 3)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  // Expose lipsync controls for ChatMessage component
  useEffect(() => {
    (window as any).__startLipsync = (audio: HTMLAudioElement) => vrmRef.current?.startLipsync(audio);
    (window as any).__stopLipsync = () => vrmRef.current?.stopLipsync();
    (window as any).__updateLipsync = (state: any) => vrmRef.current?.updateLipsync(state);
    return () => {
      delete (window as any).__startLipsync;
      delete (window as any).__stopLipsync;
      delete (window as any).__updateLipsync;
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    fetch('/api/conversations').then(r => r.ok ? r.json() : []).then(setConversations).catch(() => {})
  }, [setConversations])

  useEffect(() => {
    fetch('/api/models').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setModels(data)
        if (data.length > 0 && !selectedModelId) {
          const def = data.find((m: any) => m.isDefault) || data[0]
          setSelectedModelId(def.id)
        }
      }
    }).catch(() => {})
  }, [selectedModelId, setSelectedModelId])

  // Fetch Live2D characters
  useEffect(() => {
    fetch('/api/characters').then(r => r.ok ? r.json() : []).then((data: Live2DChar[]) => {
      if (Array.isArray(data)) {
        setCharacters(data)
        const def = data.find(c => c.isDefault) || data[0]
        if (def) {
          setSelectedCharUrl(def.modelUrl)
        }
      }
    }).catch(() => {})
  }, [])

  const switchCharacter = (char: Live2DChar) => {
    setSelectedCharUrl(char.modelUrl)
    setCharKey(prev => prev + 1)
    setShowCharSelector(false)
    setCharSearch('')
  }

  const selectConversation = useCallback(async (id: string) => {
    if (isStreaming) return
    setCurrentConversation(id)
    try {
      const res = await fetch(`/api/conversations/${id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch {}
    setSidebarOpen(false)
  }, [isStreaming, setCurrentConversation, setMessages])

  const newChat = () => {
    if (isStreaming) return
    setCurrentConversation(null)
    setMessages([])
    setSidebarOpen(false)
  }

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (isStreaming) return
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (res.ok) removeConversation(id)
    } catch {}
  }

  const autoPlayTTS = useCallback(async (text: string) => {
    const restartListening = () => {
      const fn = (window as any).__startVoiceRecording
      if (fn) setTimeout(fn, 500)
    }

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 2000) }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        vrmRef.current?.startLipsync(audio)
        audio.onended = () => { vrmRef.current?.stopLipsync(); URL.revokeObjectURL(url); restartListening() }
        audio.onerror = () => { vrmRef.current?.stopLipsync(); URL.revokeObjectURL(url); browserTTSFallback(text, restartListening) }
        audio.play()
        return
      }
    } catch {}
    browserTTSFallback(text, restartListening)
  }, [])

  const browserTTSFallback = (text: string, onDone: () => void) => {
    if (!('speechSynthesis' in window)) { onDone(); return }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 2000))
    utterance.lang = 'vi-VN'
    utterance.rate = 1.0
    utterance.pitch = 1.3
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => v.lang.startsWith('vi')) || voices.find(v => v.name.toLowerCase().includes('female'))
    if (preferred) utterance.voice = preferred
    // Connect speech synthesis lipsync
    if (vrmRef.current) {
      import('@/lib/lipsync').then(({ getLipsyncEngine }) => {
        const engine = getLipsyncEngine()
        engine.setUpdateCallback((state) => { vrmRef.current?.updateLipsync(state) })
        engine.connectSpeechSynthesis(utterance, text.slice(0, 2000))
      })
    }
    utterance.onend = () => { vrmRef.current?.stopLipsync(); onDone() }
    utterance.onerror = () => { vrmRef.current?.stopLipsync(); onDone() }
    window.speechSynthesis.speak(utterance)
  }

  const handleSend = async (message: string) => {
    const userMessage = {
      id: 'temp-' + Date.now(),
      role: 'user' as const,
      content: message,
    }
    addMessage(userMessage)
    setIsStreaming(true)
    setStreamingContent('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationId: currentConversationId,
          modelId: selectedModelId,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to send message')
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''
      let conversationId = currentConversationId

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const json = JSON.parse(data)
              if (json.content) {
                fullContent += json.content
                setStreamingContent(fullContent)
              }
              if (json.conversationId && !conversationId) {
                conversationId = json.conversationId
                setCurrentConversation(conversationId)
              }
            } catch {}
          }
        }
      }

      if (fullContent) {
        addMessage({ id: 'assistant-' + Date.now(), role: 'assistant', content: fullContent })

        // Auto-voice: play TTS then restart listening
        if (autoVoiceMode) {
          autoPlayTTS(fullContent)
        }
      }

      const convRes = await fetch('/api/conversations')
      if (convRes.ok) setConversations(await convRes.json())
    } catch (error: any) {
      addMessage({ id: 'error-' + Date.now(), role: 'assistant', content: `⚠️ Lỗi: ${error.message}` })
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
    }
  }

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Đang tải...</span>
        </div>
      </div>
    )
  }

  if (!session) return null

  const currentModel = models.find(m => m.id === selectedModelId)

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Background */}
      <div className="scene-background" style={{ backgroundImage: `url(${BACKGROUNDS[bgIndex].src})` }} />

      {/* Character (Live2D or VRM) */}
      {isVRM ? (
        <VRMCharacter
          key={charKey}
          ref={vrmRef}
          modelUrl={selectedCharUrl!}
          onModelLoaded={() => {
            setModelExpressions([])
            setModelMotionGroups([])
          }}
        />
      ) : (
        <Live2DCharacter
          key={charKey}
          ref={live2dRef}
          modelUrl={selectedCharUrl}
          onModelLoaded={(info) => {
            setModelExpressions(info.expressions)
            setModelMotionGroups(info.motionGroups)
          }}
        />
      )}

      {/* Smile / Expression trigger button — always visible */}
      <button
        type="button"
        aria-label="Biểu cảm"
        onClick={() => setShowExprPanel(p => !p)}
        style={{
          position: 'fixed',
          right: 'calc(var(--chat-panel-width) + 16px)',
          bottom: 84,
          zIndex: 35,
          width: 40,
          height: 40,
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.18)',
          background: showExprPanel ? 'rgba(99,102,241,0.55)' : 'rgba(10,12,22,0.65)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          boxShadow: showExprPanel ? '0 0 16px rgba(99,102,241,0.5)' : '0 2px 12px rgba(0,0,0,0.4)',
          transition: 'all 0.15s',
        }}
        title="Biểu cảm & Hành động"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" x2="9.01" y1="9" y2="9" />
          <line x1="15" x2="15.01" y1="9" y2="9" />
        </svg>
      </button>

      {/* Expression / Preset panel */}
      {showExprPanel && (
        <div style={{
          position: 'fixed',
          bottom: 134,
          right: 'calc(var(--chat-panel-width) + 16px)',
          zIndex: 36,
          width: 360,
          maxWidth: 'calc(100vw - var(--chat-panel-width) - var(--toolbar-width) - 24px)',
          padding: '12px 14px',
          borderRadius: 14,
          background: 'rgba(8,10,22,0.90)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
        }}>
          {isVRM ? (
            <>
              {/* VRM Emotion controls */}
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Biểu cảm 3D</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { label: '😊 Vui', emotion: 'happy' },
                  { label: '😢 Buồn', emotion: 'sad' },
                  { label: '😠 Giận', emotion: 'angry' },
                  { label: '😲 Ngạc nhiên', emotion: 'surprised' },
                  { label: '😌 Thư giãn', emotion: 'relaxed' },
                  { label: '😐 Bình thường', emotion: 'neutral' },
                  { label: '🎉 Vui vẻ', emotion: 'fun' },
                ].map(({ label, emotion }) => (
                  <button key={emotion}
                    onClick={() => vrmRef.current?.triggerEmotion(emotion)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.9)', cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.4)'; e.currentTarget.style.borderColor = 'rgba(129,140,248,0.7)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)' }}
                  >{label}</button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Outfit presets */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(['Bỏ kính', 'Bỏ áo khoác', 'Bỏ áo khoác và kính', 'Nguyên bản'] as const).map((label, i) => {
                  const presets = ['no-glass', 'no-coat', 'no-coat-glass', 'original'] as const
                  return (
                    <button key={label}
                      onClick={() => live2dRef.current?.triggerOutfitPreset(presets[i])}
                      style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.9)', cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.4)'; e.currentTarget.style.borderColor = 'rgba(129,140,248,0.7)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)' }}
                    >{label}</button>
                  )
                })}
              </div>

              <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />

              {/* Action presets */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(['Thả tim', 'Chào #1', 'Chào #2', 'Tạo dáng'] as const).map((label, i) => {
                  const presets = ['heart', 'greet1', 'greet2', 'pose'] as const
                  return (
                    <button key={label}
                      onClick={() => live2dRef.current?.triggerActionPreset(presets[i])}
                      style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.9)', cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.4)'; e.currentTarget.style.borderColor = 'rgba(129,140,248,0.7)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)' }}
                    >{label}</button>
                  )
                })}
              </div>

              {/* Model-specific expressions */}
              {modelExpressions.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Biểu cảm</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    <button onClick={() => live2dRef.current?.triggerExpression()} style={{ padding: '3px 10px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 11 }}>🎲 Random</button>
                    {modelExpressions.map((name, i) => (
                      <button key={i} onClick={() => live2dRef.current?.triggerExpression(i)} style={{ padding: '3px 10px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 11 }}>{name}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Model-specific motions */}
              {modelMotionGroups.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Hành động</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {modelMotionGroups.map(group =>
                      Array.from({ length: group.count }, (_, i) => (
                        <button key={`${group.name}-${i}`} onClick={() => live2dRef.current?.triggerMotion(group.name, i)} style={{ padding: '3px 10px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 11 }}>{group.name}{group.count > 1 ? ` ${i + 1}` : ''}</button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Left Toolbar */}
      <div className="left-toolbar">
        <button className="toolbar-btn" onClick={newChat} title="Chat mới">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>

        <button className={`toolbar-btn ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(!sidebarOpen)} title="Lịch sử chat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </button>

        <button className={`toolbar-btn ${showBgSelector ? 'active' : ''}`} onClick={() => setShowBgSelector(!showBgSelector)} title="Đổi nền">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
          </svg>
        </button>

        {characters.length > 0 && (
          <button className={`toolbar-btn ${showCharSelector ? 'active' : ''}`} onClick={() => setShowCharSelector(!showCharSelector)} title="Đổi nhân vật">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </button>
        )}

        <button className={`toolbar-btn ${showSettings ? 'active' : ''}`} onClick={() => setShowSettings(true)} title="Cài đặt">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>

        <div className="toolbar-spacer" />

        {session?.user?.role === 'admin' && (
          <button className="toolbar-btn" onClick={() => router.push('/admin')} title="Quản trị">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        )}
      </div>

      {/* Conversation Sidebar (overlay) */}
      <div className={`conv-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="conv-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>Lịch sử chat</span>
            <button className="toolbar-btn" onClick={() => setSidebarOpen(false)} style={{ width: 28, height: 28 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="conv-list">
          {conversations.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '32px 16px' }}>
              Chưa có cuộc trò chuyện
            </div>
          ) : conversations.map(conv => (
            <div
              key={conv.id}
              className={`conv-item ${currentConversationId === conv.id ? 'active' : ''}`}
              onClick={() => selectConversation(conv.id)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0 }}>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.title}</span>
              <button
                onClick={(e) => deleteConversation(e, conv.id)}
                style={{ opacity: 0, transition: 'opacity 0.15s', padding: 4, borderRadius: 4, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '1' }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '0' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21A48.108 48.108 0 0015.75 5.4m-12 .562A48.11 48.11 0 017.25 5.4m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 27 }} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Background Selector */}
      {showBgSelector && (
        <div className="bg-selector animate-fade-in">
          {BACKGROUNDS.map((bg, i) => (
            <img
              key={bg.id}
              src={bg.src}
              alt={bg.label}
              className={`bg-thumb ${i === bgIndex ? 'active' : ''}`}
              onClick={() => { setBgIndex(i); setShowBgSelector(false) }}
            />
          ))}
        </div>
      )}

      {/* Character Selector */}
      {showCharSelector && characters.length > 0 && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 24 }} onClick={() => { setShowCharSelector(false); setCharSearch('') }} />
          <div className="char-selector animate-fade-in">
            <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>Chọn nhân vật</div>
              <input
                type="text"
                value={charSearch}
                onChange={(e) => setCharSearch(e.target.value)}
                placeholder="Tìm kiếm nhân vật..."
                autoFocus
                style={{
                  width: '100%', padding: '6px 10px', fontSize: 12, borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)',
                  color: '#fff', outline: 'none',
                }}
              />
            </div>
            <div className="char-grid">
              {characters
                .filter(c => !charSearch || c.name.toLowerCase().includes(charSearch.toLowerCase()) || c.category.toLowerCase().includes(charSearch.toLowerCase()))
                .map((char) => (
                <button
                  key={char.id}
                  className={`char-card ${selectedCharUrl === char.modelUrl ? 'active' : ''}`}
                  onClick={() => switchCharacter(char)}
                  title={char.name}
                >
                  <div className="char-card-thumb">
                    {char.thumbnail ? (
                      <img src={char.thumbnail} alt={char.name} />
                    ) : (
                      <span style={{ fontSize: 24 }}>🎭</span>
                    )}
                  </div>
                  <span className="char-card-name">{char.name}</span>
                  {char.modelUrl.endsWith('.vrm') ? (
                    <span className="char-card-badge" style={{ background: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }}>VRM</span>
                  ) : char.modelUrl.endsWith('.glb') ? (
                    <span className="char-card-badge" style={{ background: 'rgba(234,179,8,0.3)', color: '#fde68a' }}>GLB</span>
                  ) : (
                    <span className="char-card-badge" style={{ background: 'rgba(16,185,129,0.25)', color: '#6ee7b7' }}>2D</span>
                  )}
                  {char.isDefault && <span className="char-card-badge">★</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* User Menu */}
      <div className="user-menu">
        <button className="user-menu-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #f093fb, #f5576c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700
          }}>
            {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <span>{session?.user?.name}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {showUserMenu && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 24 }} onClick={() => setShowUserMenu(false)} />
            <div className="user-dropdown" style={{ zIndex: 26 }}>
              {currentModel && (
                <div className="user-dropdown-item" style={{ cursor: 'default', opacity: 0.6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                  Model: {currentModel.name}
                </div>
              )}
              {models.map(m => (
                <button
                  key={m.id}
                  className="user-dropdown-item"
                  onClick={() => { setSelectedModelId(m.id); setShowUserMenu(false) }}
                  style={m.id === selectedModelId ? { color: '#818cf8' } : {}}
                >
                  <span style={{ width: 16, textAlign: 'center' }}>{m.id === selectedModelId ? '✓' : ''}</span>
                  {m.name}
                </button>
              ))}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
              {session?.user?.role === 'admin' && (
                <a href="/admin" className="user-dropdown-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852 1 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                  </svg>
                  Quản trị
                </a>
              )}
              <button className="user-dropdown-item danger" onClick={() => signOut({ callbackUrl: '/login' })}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                Đăng xuất
              </button>
            </div>
          </>
        )}
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        open={showSettings}
        onClose={() => setShowSettings(false)}
        bgIndex={bgIndex}
        onBgChange={(i) => { setBgIndex(i) }}
        backgrounds={BACKGROUNDS}
        followCursor={followCursor}
        onFollowCursorChange={setFollowCursor}
        scrollZoom={scrollZoom}
        onScrollZoomChange={setScrollZoom}
      />

      {/* Chat Panel (floating right) */}
      <div className="chat-panel">
        <div className="chat-header">
          <div>
            <div className="chat-header-title">VNSO Chat AI</div>
            <div className="chat-status">
              <span className="chat-status-dot" />
              {isStreaming ? 'Đang suy nghĩ...' : 'Trực tuyến'}
            </div>
          </div>
        </div>

        <div className="chat-messages">
          {messages.length === 0 && !isStreaming ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: 24 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28
              }}>
                🤖
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 6 }}>
                  Xin chào! Tôi là VNSO AI
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                  Trợ lý AI của HQG VNSO. Hãy hỏi tôi bất cứ điều gì!
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                {['VNSO là gì?', 'Viết code Python', 'Giải thích AI'].map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s)}
                    style={{
                      padding: '6px 14px', fontSize: 12, borderRadius: 20,
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.6)', cursor: 'pointer', transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.15)' }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.08)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
              ))}
              {isStreaming && streamingContent && (
                <ChatMessage role="assistant" content={streamingContent} isStreaming />
              )}
              {isStreaming && !streamingContent && (
                <div className="msg-row">
                  <div className="msg-avatar ami">AI</div>
                  <div className="msg-body">
                    <div className="thinking-label">
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                      </svg>
                      Đang suy nghĩ...
                    </div>
                    <div className="typing-indicator">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <ChatInput onSend={handleSend} />

        <div className="chat-disclaimer">
          VNSO AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
        </div>
      </div>
    </div>
  )
}
