'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

// Lightweight Live2D loader for the corner widget
function CharacterWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modelRef = useRef<any>(null)
  const appRef = useRef<any>(null)
  const [loaded, setLoaded] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const lipsyncRef = useRef<number>(0)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, isTyping])

  // Load Live2D model
  useEffect(() => {
    let cancelled = false
    const loadModel = async () => {
      try {
        setLoadProgress(10)
        // Dynamically import pixi and live2d
        const PIXI = await import('pixi.js')
        if (cancelled) return
        setLoadProgress(20)

        const { Live2DModel } = await import('pixi-live2d-display')
        if (cancelled) return
        setLoadProgress(30)

        // Register with PIXI
        ;(Live2DModel as any).registerTicker(PIXI.Ticker)
        ;(window as any).PIXI = PIXI

        if (!canvasRef.current) return

        const app = new PIXI.Application({
          view: canvasRef.current,
          transparent: true,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        })

        // Size to container
        const container = canvasRef.current.parentElement!
        app.renderer.resize(container.clientWidth, container.clientHeight)

        setLoadProgress(40)
        appRef.current = app

        const model = await Live2DModel.from('/models/Hiyori/Hiyori.model3.json')
        if (cancelled) { app.destroy(); return }

        setLoadProgress(80)

        // Scale model to fit the widget
        const scale = Math.min(
          container.clientWidth / model.width,
          container.clientHeight / model.height
        ) * 1.1
        model.scale.set(scale)
        model.x = container.clientWidth / 2
        model.y = container.clientHeight * 0.95

        model.anchor.set(0.5, 1)

        app.stage.addChild(model as any)
        modelRef.current = model

        setLoadProgress(100)
        setTimeout(() => setLoaded(true), 300)

        // Idle blinking/breathing motions
        try {
          model.internalModel?.motionManager?.startRandomMotion?.('Idle', 1)
        } catch {}
      } catch (err) {
        console.error('Failed to load character widget:', err)
      }
    }

    loadModel()
    return () => { cancelled = true; appRef.current?.destroy(); }
  }, [])

  // Lipsync animation for speaking
  const startSpeakAnimation = useCallback(() => {
    const animate = () => {
      const model = modelRef.current
      if (!model) return
      const now = Date.now()
      const base = Math.sin(now * 0.012) * 0.3 + 0.4
      const jitter = Math.sin(now * 0.031) * 0.15
      const mouthOpen = Math.max(0, Math.min(1, base + jitter))
      try {
        const coreModel = model.internalModel?.coreModel
        if (coreModel?.setParameterValueById) {
          coreModel.setParameterValueById('ParamMouthOpenY', mouthOpen)
        }
      } catch {}
      lipsyncRef.current = requestAnimationFrame(animate)
    }
    lipsyncRef.current = requestAnimationFrame(animate)
  }, [])

  const stopSpeakAnimation = useCallback(() => {
    if (lipsyncRef.current) {
      cancelAnimationFrame(lipsyncRef.current)
      lipsyncRef.current = 0
    }
    try {
      const coreModel = modelRef.current?.internalModel?.coreModel
      if (coreModel?.setParameterValueById) {
        coreModel.setParameterValueById('ParamMouthOpenY', 0)
      }
    } catch {}
  }, [])

  // Send chat message
  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return
    const userMsg = { role: 'user' as const, content: text.trim() }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    setIsTyping(true)
    startSpeakAnimation()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          systemPrompt: 'Bạn là Ami, trợ lý AI thông minh và dễ thương của VNSO. Trả lời ngắn gọn, thân thiện bằng tiếng Việt. Tối đa 2-3 câu.',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const assistantMsg = { role: 'assistant' as const, content: data.content || data.message || 'Xin lỗi, mình chưa hiểu ạ.' }
        setChatMessages(prev => [...prev, assistantMsg])

        // Try TTS
        try {
          const ttsRes = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: assistantMsg.content.slice(0, 500) }),
          })
          if (ttsRes.ok) {
            const blob = await ttsRes.blob()
            const url = URL.createObjectURL(blob)
            const audio = new Audio(url)
            audio.onended = () => { stopSpeakAnimation(); URL.revokeObjectURL(url) }
            audio.onerror = () => { stopSpeakAnimation(); URL.revokeObjectURL(url) }
            audio.play().catch(() => stopSpeakAnimation())
          } else {
            stopSpeakAnimation()
          }
        } catch {
          stopSpeakAnimation()
        }
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.' }])
        stopSpeakAnimation()
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Không thể kết nối. Vui lòng thử lại.' }])
      stopSpeakAnimation()
    } finally {
      setIsTyping(false)
    }
  }

  // Voice input
  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.lang = 'vi-VN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript
      if (text) sendMessage(text)
      setIsListening(false)
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-500 ${expanded ? 'w-[380px] h-[620px]' : 'w-[120px] h-[160px]'}`}>
      {/* Glowing border effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/30 via-pink-500/20 to-orange-500/30 blur-sm" />

      <div className={`relative w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-black/90 backdrop-blur-xl flex flex-col`}>
        {/* Header when expanded */}
        {expanded && (
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/70 text-xs font-medium tracking-wide uppercase">AMI Assistant</span>
            </div>
            <button onClick={() => setExpanded(false)} className="text-white/40 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>
        )}

        {/* Character canvas area */}
        <div
          className={`relative cursor-pointer ${expanded ? 'h-[260px] flex-shrink-0' : 'flex-1'}`}
          onClick={() => !expanded && setExpanded(true)}
        >
          {/* Loading bar */}
          {!loaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
              <div className="w-16 h-16 relative">
                <svg className="animate-spin w-full h-full" viewBox="0 0 24 24">
                  <circle className="opacity-20" cx="12" cy="12" r="10" stroke="white" strokeWidth="2" fill="none" />
                  <path className="opacity-80" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold">{loadProgress}%</span>
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="w-full h-full" />

          {/* Click hint when collapsed */}
          {!expanded && loaded && (
            <div className="absolute bottom-1 left-0 right-0 text-center">
              <span className="text-[9px] text-white/50 bg-black/50 px-2 py-0.5 rounded-full">Chat với Ami</span>
            </div>
          )}
        </div>

        {/* Chat area when expanded */}
        {expanded && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0 scrollbar-thin scrollbar-thumb-white/10">
              {chatMessages.length === 0 && (
                <div className="text-center text-white/30 text-xs mt-4">
                  <p>Xin chào! Mình là Ami 👋</p>
                  <p className="mt-1">Hỏi mình bất cứ điều gì nhé!</p>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                      : 'bg-white/10 text-white/90'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/10 px-3 py-2 rounded-xl">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input bar */}
            <div className="border-t border-white/10 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleVoice}
                  className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </button>
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(chatInput) }}
                  className="flex-1 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                    disabled={isTyping}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isTyping}
                    className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-r from-purple-600 to-orange-500 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </form>
              </div>
              {isListening && (
                <p className="text-[10px] text-red-400 text-center mt-1.5 animate-pulse">🎤 Đang nghe...</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function LandingPage2() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden" style={{ fontFamily: '"Inter", sans-serif' }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-white">AMI Chat AI</span>
          </Link>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-white/50 hover:text-white transition-colors">Tính năng</a>
            <a href="#demo" className="text-sm text-white/50 hover:text-white transition-colors">Demo</a>
            <a href="#pricing" className="text-sm text-white/50 hover:text-white transition-colors">Giá</a>
            <Link href="/chat" className="text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg transition-all">
              Bắt đầu
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Animated gradient background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[100px]" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-pink-600/5 rounded-full blur-[150px]" />
        </div>

        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-white/60">Trợ lý AI với nhân vật 2D/3D thời gian thực</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
            <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
              Trải nghiệm Chat AI
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              cùng nhân vật sống động
            </span>
          </h1>

          <p className="mt-6 text-lg text-white/50 max-w-2xl mx-auto leading-relaxed">
            AMI Chat AI mang đến trải nghiệm trò chuyện AI độc đáo với nhân vật Live2D/3D
            có thể cử động, biểu cảm và nói chuyện theo thời gian thực.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/chat"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-3.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40"
            >
              Bắt đầu miễn phí
              <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white px-8 py-3.5 rounded-xl font-semibold transition-all"
            >
              Xem thử
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">Tính năng nổi bật</span>
            </h2>
            <p className="mt-4 text-white/40 max-w-xl mx-auto">Mọi thứ bạn cần cho trải nghiệm AI hoàn hảo</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: '🎭',
                title: 'Nhân vật 2D/3D',
                desc: '70+ nhân vật Live2D và VRM/GLB 3D với biểu cảm phong phú, cử chỉ tự nhiên.',
              },
              {
                icon: '🗣️',
                title: 'Lip-sync & TTS',
                desc: 'Nhân vật đồng bộ môi khi nói, hỗ trợ giọng nói tự nhiên bằng tiếng Việt.',
              },
              {
                icon: '🧠',
                title: 'AI thông minh',
                desc: 'Hỗ trợ nhiều AI model (GPT-4o, Gemini...), phát hiện cảm xúc, ghi nhớ ngữ cảnh.',
              },
              {
                icon: '🎨',
                title: 'Tùy biến hoàn toàn',
                desc: 'Đổi background, nhân vật, ngôn ngữ, prompt. Nhiều theme và skin đa dạng.',
              },
              {
                icon: '🔒',
                title: 'Bảo mật cao',
                desc: 'Mã hóa end-to-end, rate limiting, CSRF protection, audit logging đầy đủ.',
              },
              {
                icon: '📱',
                title: 'Đa nền tảng',
                desc: 'Responsive trên mọi thiết bị. Chạy mượt trên desktop, tablet và mobile.',
              },
            ].map((f, i) => (
              <div key={i} className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-6 transition-all duration-300">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/5 to-transparent" />
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">Xem thử ngay</span>
            </h2>
            <p className="mt-4 text-white/40 max-w-xl mx-auto">Nhấn vào nhân vật ở góc phải màn hình để trò chuyện</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">1</div>
              <h3 className="text-lg font-semibold mb-2">Chọn nhân vật</h3>
              <p className="text-sm text-white/40">Hơn 70 nhân vật Live2D và 3D VRM/GLB đa dạng phong cách</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">2</div>
              <h3 className="text-lg font-semibold mb-2">Trò chuyện</h3>
              <p className="text-sm text-white/40">Gõ hoặc nói chuyện bằng giọng nói. AI trả lời thông minh</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">3</div>
              <h3 className="text-lg font-semibold mb-2">Tương tác</h3>
              <p className="text-sm text-white/40">Nhân vật lip-sync khi nói, biểu cảm theo cảm xúc cuộc hội thoại</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">Bảng giá</span>
            </h2>
            <p className="mt-4 text-white/40">Miễn phí cho cá nhân. Nâng cấp cho trải nghiệm premium.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-white/80">Miễn phí</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-bold">0₫</span>
                <span className="text-white/40 text-sm">/tháng</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['70+ nhân vật 2D/3D', 'Chat không giới hạn', 'Lip-sync cơ bản', 'Đổi background'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white/60">
                    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block w-full text-center py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white text-sm font-medium transition-all">
                Bắt đầu miễn phí
              </Link>
            </div>

            {/* Pro */}
            <div className="relative bg-gradient-to-b from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-2xl p-8">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Phổ biến nhất
              </div>
              <h3 className="text-lg font-semibold text-white">Pro</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-bold">199K</span>
                <span className="text-white/40 text-sm">/tháng</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Tất cả tính năng miễn phí', 'TTS giọng nói tự nhiên', 'Nhân vật tùy chỉnh', 'API access', 'Ưu tiên hỗ trợ'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                    <svg className="w-4 h-4 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-purple-600/20">
                Nâng cấp Pro
              </Link>
            </div>

            {/* Enterprise */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-white/80">Enterprise</h3>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-bold">Liên hệ</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['Tất cả tính năng Pro', 'Deploy on-premise', 'Custom AI model', 'SLA 99.9%', 'Đội ngũ hỗ trợ riêng'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white/60">
                    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="mailto:contact@vnso.vn" className="block w-full text-center py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white text-sm font-medium transition-all">
                Liên hệ tư vấn
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
            </div>
            <span className="text-sm text-white/50">© 2026 AMI Chat AI — HQG VNSO</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm text-white/40 hover:text-white transition-colors">Đăng nhập</Link>
            <Link href="/register" className="text-sm text-white/40 hover:text-white transition-colors">Đăng ký</Link>
            <Link href="/landingpage1" className="text-sm text-white/40 hover:text-white transition-colors">ZeroWeight AI</Link>
          </div>
        </div>
      </footer>

      {/* Character Widget - bottom right corner */}
      <CharacterWidget />
    </div>
  )
}
