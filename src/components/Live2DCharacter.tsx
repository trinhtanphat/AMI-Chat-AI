'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Live2DCharacterProps {
  modelUrl?: string
  onZoomChange?: (zoom: number) => void
  onModelLoaded?: (info: ModelInfo) => void
}

export interface ModelInfo {
  expressions: string[]
  motionGroups: { name: string; count: number }[]
}

const DEFAULT_MODEL_URL = '/models/Haru_Greeter/haru_greeter_t03.model3.json'

const MIN_ZOOM = 0.3
const MAX_ZOOM = 3.0
const ZOOM_STEP = 0.1

export default function Live2DCharacter({ modelUrl, onZoomChange, onModelLoaded }: Live2DCharacterProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<any>(null)
  const modelRef = useRef<any>(null)
  const initedRef = useRef(false)
  const baseScaleRef = useRef(1)
  const zoomRef = useRef(1)
  const [isLoading, setIsLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [expressions, setExpressions] = useState<string[]>([])
  const [motionGroups, setMotionGroups] = useState<{ name: string; count: number }[]>([])
  const [showMotionPanel, setShowMotionPanel] = useState(false)

  const applyZoom = useCallback((newZoom: number) => {
    const model = modelRef.current
    if (!model || !containerRef.current) return
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))
    zoomRef.current = clamped
    setZoom(clamped)
    onZoomChange?.(clamped)

    const w = containerRef.current.clientWidth
    const h = containerRef.current.clientHeight
    const scale = baseScaleRef.current * clamped
    const origH = model.height / model.scale.y
    const origW = model.width / model.scale.x
    model.scale.set(scale)
    model.x = (w - origW * scale) / 2
    model.y = h - origH * scale
  }, [onZoomChange])

  const triggerExpression = useCallback((index?: number) => {
    const model = modelRef.current
    if (!model) return
    if (index !== undefined) model.expression(index)
    else model.expression()
  }, [])

  const triggerMotion = useCallback((group: string, index?: number) => {
    const model = modelRef.current
    if (!model) return
    model.motion(group, index)
  }, [])

  useEffect(() => {
    if (initedRef.current) return
    let cancelled = false
    let timerId: ReturnType<typeof setTimeout> | null = null

    const checkAndInit = () => {
      if (cancelled) return
      const w = window as any
      if (w.Live2DCubismCore && w.Live2D) {
        doInit()
      } else {
        setLoadProgress('Đang tải Live2D SDK...')
        timerId = setTimeout(checkAndInit, 300)
      }
    }

    const doInit = async () => {
      if (cancelled || !containerRef.current) return
      initedRef.current = true

      try {
        setIsLoading(true)
        setError(null)
        setLoadProgress('Đang khởi tạo...')

        const PIXI = await import('pixi.js')
        if (cancelled) return
        ;(window as any).PIXI = PIXI

        const { Live2DModel } = await import('pixi-live2d-display')
        if (cancelled) return

        Live2DModel.registerTicker(PIXI.Ticker)

        const container = containerRef.current
        if (!container || cancelled) return

        const width = container.clientWidth || window.innerWidth
        const height = container.clientHeight || window.innerHeight

        setLoadProgress('Đang tạo canvas...')

        const app = new PIXI.Application({
          width,
          height,
          backgroundAlpha: 0,
          antialias: true,
          resolution: 1,
        })
        if (cancelled) { app.destroy(true); return }

        const canvas = app.view as HTMLCanvasElement
        canvas.style.width = '100%'
        canvas.style.height = '100%'
        canvas.style.display = 'block'
        canvas.style.pointerEvents = 'auto'
        canvas.style.touchAction = 'none'
        container.appendChild(canvas)
        appRef.current = app

        const url = modelUrl || DEFAULT_MODEL_URL
        setLoadProgress('Đang tải model...')

        const model = await Live2DModel.from(url, {
          autoHitTest: true,
          autoFocus: true,
          autoUpdate: true,
          ticker: PIXI.Ticker.shared,
        })
        if (cancelled) { app.destroy(true); return }
        modelRef.current = model

        setLoadProgress('Đang render nhân vật...')

        const modelH = model.height
        const modelW = model.width
        const scale = Math.min((height * 0.85) / modelH, (width * 0.8) / modelW)
        baseScaleRef.current = scale
        model.scale.set(scale * zoomRef.current)
        model.x = (width - modelW * scale * zoomRef.current) / 2
        model.y = height - modelH * scale * zoomRef.current

        model.on('hit', (hitAreas: string[]) => {
          if (hitAreas.includes('Body') || hitAreas.includes('body')) {
            model.motion('Tap') || model.motion('tap') || model.motion('TapBody')
          }
          if (hitAreas.includes('Head') || hitAreas.includes('head')) {
            model.expression()
          }
        })

        app.stage.addChild(model)

        // Extract expressions and motions
        const expNames: string[] = []
        const motGroups: { name: string; count: number }[] = []
        try {
          const internalModel = model.internalModel
          if (internalModel?.settings) {
            const settings = internalModel.settings
            if (settings.expressions) {
              settings.expressions.forEach((e: any) => {
                expNames.push(e.Name || e.name || 'Expression')
              })
            }
            if (settings.motions) {
              Object.entries(settings.motions).forEach(([group, items]: [string, any]) => {
                if (Array.isArray(items) && items.length > 0) {
                  motGroups.push({ name: group, count: items.length })
                }
              })
            }
          }
        } catch {}
        setExpressions(expNames)
        setMotionGroups(motGroups)
        onModelLoaded?.({ expressions: expNames, motionGroups: motGroups })

        setIsLoading(false)
        setLoadProgress('')
      } catch (err: any) {
        console.error('Failed to load Live2D model:', err)
        if (!cancelled) {
          setError(err.message || 'Failed to load Live2D model')
          setIsLoading(false)
          setLoadProgress('')
        }
      }
    }

    checkAndInit()

    return () => {
      cancelled = true
      if (timerId) clearTimeout(timerId)
      if (appRef.current) {
        try { appRef.current.destroy(true) } catch {}
        appRef.current = null
      }
      modelRef.current = null
      initedRef.current = false
    }
  }, [modelUrl])

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !appRef.current || !modelRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      appRef.current.renderer.resize(w, h)
      const model = modelRef.current
      const origH = model.height / model.scale.y
      const origW = model.width / model.scale.x
      const newBase = Math.min((h * 0.85) / origH, (w * 0.8) / origW)
      baseScaleRef.current = newBase
      const scale = newBase * zoomRef.current
      model.scale.set(scale)
      model.x = (w - origW * scale) / 2
      model.y = h - origH * scale
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Mouse wheel zoom
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      applyZoom(zoomRef.current + delta)
    }
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [applyZoom])

  const btnStyle: React.CSSProperties = {
    padding: '3px 10px', borderRadius: 10, border: 'none',
    background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)',
    cursor: 'pointer', fontSize: 11, transition: 'all 0.15s', whiteSpace: 'nowrap',
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 'var(--toolbar-width)',
        right: 'var(--chat-panel-width)',
        height: '100%',
        zIndex: 5,
        pointerEvents: 'auto',
        overflow: 'hidden',
        opacity: isLoading ? 0 : 1,
        transition: 'opacity 0.5s ease-in-out',
      }}
    >
      {/* Bottom bar: zoom + actions */}
      {!isLoading && !error && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 6, zIndex: 10,
          padding: '6px 12px', borderRadius: 20,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}>
          <button
            onClick={() => applyZoom(zoomRef.current - ZOOM_STEP)}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            title="Thu nhỏ"
          >−</button>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, minWidth: 40, textAlign: 'center', fontWeight: 500 }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => applyZoom(zoomRef.current + ZOOM_STEP)}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            title="Phóng to"
          >+</button>
          <button
            onClick={() => applyZoom(1)}
            style={{
              marginLeft: 2, padding: '2px 8px', borderRadius: 12, border: 'none',
              background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer', fontSize: 11, transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            title="Reset zoom"
          >Reset</button>

          {(expressions.length > 0 || motionGroups.length > 0) && (
            <>
              <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />
              <button
                onClick={() => setShowMotionPanel(p => !p)}
                style={{
                  padding: '2px 10px', borderRadius: 12, border: 'none',
                  background: showMotionPanel ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 13,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = showMotionPanel ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.background = showMotionPanel ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)')}
                title="Biểu cảm & Hành động"
              >🎭</button>
            </>
          )}
        </div>
      )}

      {/* Expression/Motion panel */}
      {showMotionPanel && !isLoading && (
        <div style={{
          position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
          zIndex: 11, padding: '10px 14px', borderRadius: 14,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
          maxHeight: 280, overflowY: 'auto', minWidth: 200, maxWidth: 360,
        }}>
          {expressions.length > 0 && (
            <div style={{ marginBottom: motionGroups.length > 0 ? 10 : 0 }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                Biểu cảm
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                <button onClick={() => triggerExpression()} style={btnStyle}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
                >🎲 Random</button>
                {expressions.map((name, i) => (
                  <button key={i} onClick={() => triggerExpression(i)} style={btnStyle}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
                  >{name}</button>
                ))}
              </div>
            </div>
          )}
          {motionGroups.length > 0 && (
            <div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                Hành động
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {motionGroups.map(group => (
                  <div key={group.name} style={{ display: 'contents' }}>
                    {Array.from({ length: group.count }, (_, i) => (
                      <button key={`${group.name}-${i}`} onClick={() => triggerMotion(group.name, i)} style={btnStyle}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = '#fff' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
                      >{group.name}{group.count > 1 ? ` ${i + 1}` : ''}</button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced loading overlay */}
      {isLoading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 16,
        }}>
          <div style={{ position: 'relative', width: 56, height: 56 }}>
            <svg className="animate-spin" width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ position: 'absolute', inset: 0 }}>
              <defs>
                <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
              </defs>
              <circle cx="28" cy="28" r="24" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
              <path d="M52 28a24 24 0 01-18.7 23.4" stroke="url(#spinGrad)" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎭</span>
          </div>
          <div style={{
            padding: '6px 16px', borderRadius: 12,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
            color: 'rgba(255,255,255,0.6)', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {loadProgress || 'Đang tải nhân vật'}
            <span style={{ display: 'inline-flex', gap: 2 }}>
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
            </span>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 16px', borderRadius: 12,
          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)',
          backdropFilter: 'blur(8px)',
          color: 'rgba(255,255,255,0.7)', fontSize: 12,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          Không thể tải Live2D: {error}
        </div>
      )}
    </div>
  )
}
