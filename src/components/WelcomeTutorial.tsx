'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const TUTORIAL_SEEN_KEY = 'ami.tutorial.seen.v2'

interface WelcomeTutorialProps {
  onClose: () => void
}

interface TourStep {
  target: string
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right'
  icon: string
}

const INTRO_STEP = {
  icon: '👋',
  title: 'Chào mừng đến với AMI!',
  description: 'AMI là trợ lý AI của HQG VNSO. Để mình hướng dẫn bạn sử dụng nhé!',
}

const TOUR_STEPS: TourStep[] = [
  {
    target: 'chat-panel',
    title: 'Khung chat',
    description: 'Đây là nơi bạn trò chuyện với AMI. Gõ tin nhắn và AMI sẽ trả lời bằng giọng nói kèm cử chỉ miệng siêu dễ thương!',
    position: 'left',
    icon: '💬',
  },
  {
    target: 'chat-input',
    title: 'Ô nhập tin nhắn',
    description: 'Gõ câu hỏi ở đây rồi nhấn Enter hoặc nút gửi. AMI sẽ trả lời bằng giọng nói và cử động miệng theo lời nói!',
    position: 'top',
    icon: '⌨️',
  },
  {
    target: 'mic-btn',
    title: 'Nhập bằng giọng nói',
    description: 'Bấm nút này để nói chuyện trực tiếp với AMI bằng tiếng Việt. AMI sẽ nghe, hiểu và phản hồi bằng giọng nói!',
    position: 'top',
    icon: '🎤',
  },
  {
    target: 'char-btn',
    title: 'Đổi nhân vật',
    description: 'Chọn từ hơn 70 nhân vật 2D (Live2D) và 3D (VRM/GLB). Thử nhân vật AMI-VNSO mặc định nhé!',
    position: 'right',
    icon: '🎭',
  },
  {
    target: 'expr-btn',
    title: 'Biểu cảm & Hành động',
    description: 'Thay đổi biểu cảm nhân vật: vui, buồn, giận, ngạc nhiên... và các hành động như thả tim, chào, tạo dáng!',
    position: 'left',
    icon: '😊',
  },
  {
    target: 'bg-btn',
    title: 'Đổi hình nền',
    description: 'Chọn từ 8 hình nền anime phong cách Nhật Bản: hoa anh đào, phố đêm Tokyo, hoàng hôn...',
    position: 'right',
    icon: '🖼️',
  },
  {
    target: 'settings-btn',
    title: 'Cài đặt',
    description: 'Tùy chỉnh ngôn ngữ, hiệu ứng theo chuột, zoom, và gửi phản hồi cho nhà phát triển.',
    position: 'right',
    icon: '⚙️',
  },
]

export default function WelcomeTutorial({ onClose }: WelcomeTutorialProps) {
  const [phase, setPhase] = useState<'intro' | 'tour'>('intro')
  const [step, setStep] = useState(0)
  const [spotlight, setSpotlight] = useState<DOMRect | null>(null)
  const [tooltipPos, setTooltipPos] = useState<React.CSSProperties>({})
  const [arrowPos, setArrowPos] = useState<React.CSSProperties>({})
  const [visible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const computePositions = useCallback(() => {
    if (phase !== 'tour') return
    const current = TOUR_STEPS[step]
    const el = document.querySelector(`[data-tour="${current.target}"]`)
    if (!el) return

    const rect = el.getBoundingClientRect()
    setSpotlight(rect)

    const pad = 14
    const tw = 320
    const th = 180
    let style: React.CSSProperties = { position: 'fixed', width: tw, zIndex: 10002 }
    let arrow: React.CSSProperties = { position: 'absolute', width: 0, height: 0 }
    const dir = current.position

    if (dir === 'right') {
      style.top = Math.max(10, Math.min(rect.top + rect.height / 2 - th / 2, window.innerHeight - th - 10))
      style.left = rect.right + pad + 8
      if (style.left as number + tw > window.innerWidth - 10) {
        style.left = Math.max(10, rect.left - pad - 8 - tw)
        arrow = { ...arrow, right: -8, top: '50%', transform: 'translateY(-50%)', borderLeft: '8px solid rgba(15,15,35,0.97)', borderTop: '8px solid transparent', borderBottom: '8px solid transparent' }
      } else {
        arrow = { ...arrow, left: -8, top: '50%', transform: 'translateY(-50%)', borderRight: '8px solid rgba(15,15,35,0.97)', borderTop: '8px solid transparent', borderBottom: '8px solid transparent' }
      }
    } else if (dir === 'left') {
      style.top = Math.max(10, Math.min(rect.top + rect.height / 2 - th / 2, window.innerHeight - th - 10))
      style.left = Math.max(10, rect.left - pad - 8 - tw)
      arrow = { ...arrow, right: -8, top: '50%', transform: 'translateY(-50%)', borderLeft: '8px solid rgba(15,15,35,0.97)', borderTop: '8px solid transparent', borderBottom: '8px solid transparent' }
    } else if (dir === 'top') {
      style.left = Math.max(10, Math.min(rect.left + rect.width / 2 - tw / 2, window.innerWidth - tw - 10))
      style.top = Math.max(10, rect.top - pad - 8 - th)
      if ((style.top as number) < 10) {
        style.top = rect.bottom + pad + 8
        arrow = { ...arrow, top: -8, left: '50%', transform: 'translateX(-50%)', borderBottom: '8px solid rgba(15,15,35,0.97)', borderLeft: '8px solid transparent', borderRight: '8px solid transparent' }
      } else {
        arrow = { ...arrow, bottom: -8, left: '50%', transform: 'translateX(-50%)', borderTop: '8px solid rgba(15,15,35,0.97)', borderLeft: '8px solid transparent', borderRight: '8px solid transparent' }
      }
    } else {
      style.left = Math.max(10, Math.min(rect.left + rect.width / 2 - tw / 2, window.innerWidth - tw - 10))
      style.top = rect.bottom + pad + 8
      arrow = { ...arrow, top: -8, left: '50%', transform: 'translateX(-50%)', borderBottom: '8px solid rgba(15,15,35,0.97)', borderLeft: '8px solid transparent', borderRight: '8px solid transparent' }
    }

    setTooltipPos(style)
    setArrowPos(arrow)
  }, [phase, step])

  useEffect(() => {
    computePositions()
    const onResize = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(computePositions, 80)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [computePositions])

  const handleClose = () => {
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true')
    setVisible(false)
    setTimeout(onClose, 200)
  }

  const nextStep = () => {
    if (step < TOUR_STEPS.length - 1) setStep(step + 1)
    else handleClose()
  }

  const prevStep = () => {
    if (step > 0) setStep(step - 1)
  }

  const startTour = () => {
    setPhase('tour')
    setStep(0)
  }

  if (!visible) return null

  // ====== INTRO SCREEN ======
  if (phase === 'intro') {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        animation: 'tutFadeIn 0.3s ease',
      }}>
        <div style={{
          width: '90%', maxWidth: 480, borderRadius: 20,
          background: 'linear-gradient(145deg, rgba(15,15,35,0.97), rgba(25,20,50,0.97))',
          border: '1px solid rgba(139,92,246,0.3)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(139,92,246,0.15)',
          overflow: 'hidden', animation: 'tutSlideUp 0.4s ease',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)',
            padding: '32px 28px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>👋</div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#fff' }}>{INTRO_STEP.title}</h2>
          </div>
          <div style={{ padding: '20px 28px' }}>
            <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.85)' }}>{INTRO_STEP.description}</p>
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', fontSize: 13, color: 'rgba(196,181,253,0.9)', lineHeight: 1.5 }}>
              💡 Mình sẽ highlight từng vị trí trên giao diện để bạn dễ làm quen nhé!
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 28px 24px' }}>
            <button onClick={handleClose} style={{
              padding: '10px 20px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}>Bỏ qua</button>
            <button onClick={startTour} style={{
              padding: '10px 28px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              boxShadow: '0 4px 16px rgba(139,92,246,0.4)',
            }}>Bắt đầu hướng dẫn →</button>
          </div>
        </div>
        <style>{tutorialCSS}</style>
      </div>
    )
  }

  // ====== TOUR WITH SPOTLIGHT ======
  const current = TOUR_STEPS[step]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none' }}>
      {/* Dark overlay with spotlight cutout */}
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 9999, pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlight && (
              <rect
                x={spotlight.left - 6}
                y={spotlight.top - 6}
                width={spotlight.width + 12}
                height={spotlight.height + 12}
                rx="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#tour-mask)" />
      </svg>

      {/* Glow border around target */}
      {spotlight && (
        <div style={{
          position: 'fixed',
          left: spotlight.left - 6, top: spotlight.top - 6,
          width: spotlight.width + 12, height: spotlight.height + 12,
          borderRadius: 10,
          border: '2px solid rgba(139,92,246,0.7)',
          boxShadow: '0 0 20px rgba(139,92,246,0.4), 0 0 40px rgba(139,92,246,0.2)',
          zIndex: 10001, pointerEvents: 'none',
          animation: 'tutPulseGlow 2s infinite',
        }} />
      )}

      {/* Tooltip */}
      <div style={{
        ...tooltipPos,
        borderRadius: 16,
        background: 'rgba(15,15,35,0.97)',
        border: '1px solid rgba(139,92,246,0.35)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5), 0 0 30px rgba(139,92,246,0.1)',
        padding: '16px 18px 14px',
        pointerEvents: 'auto',
        animation: 'tutFadeIn 0.25s ease',
      }}>
        <div style={arrowPos} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 20 }}>{current.icon}</span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>{current.title}</h3>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{step + 1}/{TOUR_STEPS.length}</span>
        </div>

        <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.75)' }}>
          {current.description}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {TOUR_STEPS.map((_, i) => (
              <div key={i} style={{
                width: i === step ? 20 : 7, height: 7, borderRadius: 4,
                background: i === step ? 'linear-gradient(135deg, #a855f7, #ec4899)' : i < step ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.15)',
                transition: 'all 0.3s', cursor: 'pointer',
              }} onClick={() => setStep(i)} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleClose} style={{
              padding: '5px 12px', borderRadius: 8, border: 'none',
              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer', fontSize: 12,
            }}>Bỏ qua</button>
            {step > 0 && (
              <button onClick={prevStep} style={{
                padding: '5px 14px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 12,
              }}>←</button>
            )}
            <button onClick={nextStep} style={{
              padding: '5px 16px', borderRadius: 8, border: 'none',
              background: step === TOUR_STEPS.length - 1
                ? 'linear-gradient(135deg, #7c3aed, #ec4899)'
                : 'linear-gradient(135deg, #7c3aed, #a855f7)',
              color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              boxShadow: '0 2px 10px rgba(139,92,246,0.3)',
            }}>{step === TOUR_STEPS.length - 1 ? 'Hoàn tất! 🚀' : 'Tiếp →'}</button>
          </div>
        </div>
      </div>

      <style>{tutorialCSS}</style>
    </div>
  )
}

const tutorialCSS = `
  @keyframes tutFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes tutSlideUp {
    from { opacity: 0; transform: translateY(30px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes tutPulseGlow {
    0%, 100% { box-shadow: 0 0 20px rgba(139,92,246,0.4), 0 0 40px rgba(139,92,246,0.2); }
    50% { box-shadow: 0 0 30px rgba(139,92,246,0.6), 0 0 60px rgba(139,92,246,0.3); }
  }
`

export function shouldShowTutorial(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(TUTORIAL_SEEN_KEY) !== 'true'
}
