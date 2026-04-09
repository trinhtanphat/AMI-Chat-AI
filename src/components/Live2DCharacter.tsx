'use client'

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import type { LipsyncState } from '@/lib/lipsync'

interface Live2DCharacterProps {
  modelUrl?: string
  onZoomChange?: (zoom: number) => void
  onModelLoaded?: (info: ModelInfo) => void
}

export interface Live2DCharacterHandle {
  triggerOutfitPreset: (preset: 'no-glass' | 'no-coat' | 'no-coat-glass' | 'original') => void
  triggerActionPreset: (preset: 'heart' | 'greet1' | 'greet2' | 'pose') => void
  triggerExpression: (index?: number) => void
  triggerMotion: (group: string, index?: number) => void
  getExpressions: () => string[]
  getMotionGroups: () => { name: string; count: number }[]
  startLipsync: (audio: HTMLAudioElement) => void
  stopLipsync: () => void
  updateLipsync: (state: LipsyncState) => void
}

export interface ModelInfo {
  expressions: string[]
  motionGroups: { name: string; count: number }[]
}

const DEFAULT_MODEL_URL = '/models/Haru_Greeter/haru_greeter_t03.model3.json'

const MIN_ZOOM = 0.3
const MAX_ZOOM = 3.0
const ZOOM_STEP = 0.1
const POSITION_STORAGE_KEY = 'ami.live2d.positions.v1'

const Live2DCharacter = forwardRef<Live2DCharacterHandle, Live2DCharacterProps>(
function Live2DCharacter({ modelUrl, onZoomChange, onModelLoaded }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<any>(null)
  const modelRef = useRef<any>(null)
  const initedRef = useRef(false)
  const onModelLoadedRef = useRef(onModelLoaded)
  const baseScaleRef = useRef(1)
  const zoomRef = useRef(1)
  const positionOffsetRef = useRef({ x: 0, y: 0 })
  const sceneSizeRef = useRef({ w: 0, h: 0 })
  const dragFrameRef = useRef<number | null>(null)
  const pendingDragRef = useRef<{ x: number; y: number } | null>(null)
  const lipsyncEngineRef = useRef<any>(null)
  const mouthOpenRef = useRef(0)
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    baseOffsetX: 0,
    baseOffsetY: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [expressions, setExpressions] = useState<string[]>([])
  const [motionGroups, setMotionGroups] = useState<{ name: string; count: number }[]>([])     

  // Keep callback ref in sync without triggering re-init
  useEffect(() => { onModelLoadedRef.current = onModelLoaded }, [onModelLoaded])

  const applyTransformWithOffset = useCallback((model: any, scale: number) => {
    if (!containerRef.current) return
    const w = sceneSizeRef.current.w || containerRef.current.clientWidth
    const h = sceneSizeRef.current.h || containerRef.current.clientHeight
    sceneSizeRef.current = { w, h }
    const origH = model.height / model.scale.y
    const origW = model.width / model.scale.x
    model.scale.set(scale)
    model.x = (w - origW * scale) / 2 + positionOffsetRef.current.x
    model.y = h - origH * scale + positionOffsetRef.current.y
  }, [])

  const getModelPositionKey = useCallback(() => modelUrl || DEFAULT_MODEL_URL, [modelUrl])

  const loadSavedPosition = useCallback(() => {
    try {
      const raw = localStorage.getItem(POSITION_STORAGE_KEY)
      if (!raw) return { x: 0, y: 0 }
      const all = JSON.parse(raw) as Record<string, { x: number; y: number }>
      const current = all[getModelPositionKey()]
      if (!current || typeof current.x !== 'number' || typeof current.y !== 'number') {
        return { x: 0, y: 0 }
      }
      return current
    } catch {
      return { x: 0, y: 0 }
    }
  }, [getModelPositionKey])

  const saveCurrentPosition = useCallback(() => {
    try {
      const raw = localStorage.getItem(POSITION_STORAGE_KEY)
      const all = raw ? (JSON.parse(raw) as Record<string, { x: number; y: number }>) : {}
      all[getModelPositionKey()] = {
        x: positionOffsetRef.current.x,
        y: positionOffsetRef.current.y,
      }
      localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(all))
    } catch {}
  }, [getModelPositionKey])

  const applyZoom = useCallback((newZoom: number) => {
    const model = modelRef.current
    if (!model || !containerRef.current) return
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))
    zoomRef.current = clamped
    setZoom(clamped)
    onZoomChange?.(clamped)
    const scale = baseScaleRef.current * clamped
    applyTransformWithOffset(model, scale)
  }, [applyTransformWithOffset, onZoomChange])

  const resetPosition = useCallback(() => {
    const model = modelRef.current
    if (!model) return
    positionOffsetRef.current = { x: 0, y: 0 }
    applyTransformWithOffset(model, baseScaleRef.current * zoomRef.current)
    saveCurrentPosition()
  }, [applyTransformWithOffset, saveCurrentPosition])

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

  const findExpressionIndex = useCallback((keywords: string[]) => {
    const normalized = expressions.map(e => e.toLowerCase())
    return normalized.findIndex(name => keywords.some(k => name.includes(k)))
  }, [expressions])

  const playPresetMotion = useCallback((keywords: string[], preferredIndex = 0) => {
    const group = motionGroups.find(g => keywords.some(k => g.name.toLowerCase().includes(k)))
    if (!group) return false
    triggerMotion(group.name, Math.min(preferredIndex, Math.max(0, group.count - 1)))
    return true
  }, [motionGroups, triggerMotion])

  const triggerOutfitPreset = useCallback((preset: 'no-glass' | 'no-coat' | 'no-coat-glass' | 'original') => {
    const map: Record<string, string[]> = {
      'no-glass': ['no glass', 'noglass', 'glass off', 'without glass', 'bo kinh', 'megane', 'glassesoff'],
      'no-coat': ['no coat', 'without coat', 'coat off', 'bo ao khoac', 'jacket off', 'without jacket'],
      'no-coat-glass': ['no coat glass', 'without coat glass', 'both off', 'bo ao khoac va kinh', 'jacket and glass'],
      'original': ['original', 'base', 'default', 'normal', 'nguyen ban'],
    }
    const idx = findExpressionIndex(map[preset])
    if (idx >= 0) {
      triggerExpression(idx)
      return
    }
    if (preset === 'original') {
      triggerExpression(0)
      return
    }
    triggerExpression()
  }, [findExpressionIndex, triggerExpression])

  const triggerActionPreset = useCallback((preset: 'heart' | 'greet1' | 'greet2' | 'pose') => {
    if (preset === 'heart') {
      if (!playPresetMotion(['heart', 'love', 'special'], 0)) playPresetMotion(['tap', 'idle'], 0)
      return
    }
    if (preset === 'greet1') {
      if (!playPresetMotion(['greet', 'hello', 'wave', 'start'], 0)) playPresetMotion(['tap', 'idle'], 0)
      return
    }
    if (preset === 'greet2') {
      if (!playPresetMotion(['greet', 'hello', 'wave', 'start'], 1)) playPresetMotion(['tap', 'idle'], 1)
      return
    }
    if (!playPresetMotion(['pose', 'special', 'idle'], 0)) playPresetMotion(['tap'], 0)
  }, [playPresetMotion])

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
        sceneSizeRef.current = { w: width, h: height }

        setLoadProgress('Đang tạo canvas...')

        const app = new PIXI.Application({
          width,
          height,
          backgroundAlpha: 0,
          antialias: true,
          resolution: 1,
          resizeTo: undefined,
        })
        if (cancelled) { try { app.destroy(true) } catch {} return }

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
        } as any)
        if (cancelled) { try { app.destroy(true) } catch {} return }
        modelRef.current = model

        setLoadProgress('Đang render nhân vật...')

        const modelH = model.height
        const modelW = model.width
        const scale = Math.min((height * 0.85) / modelH, (width * 0.8) / modelW)
        baseScaleRef.current = scale
        positionOffsetRef.current = loadSavedPosition()
        applyTransformWithOffset(model, scale * zoomRef.current)

        model.on('hit', (hitAreas: string[]) => {
          if (hitAreas.includes('Body') || hitAreas.includes('body')) {
            model.motion('Tap') || model.motion('tap') || model.motion('TapBody')
          }
          if (hitAreas.includes('Head') || hitAreas.includes('head')) {
            model.expression()
          }
        })

        app.stage.addChild(model)

        // Add beauty mark (nốt ruồi) for Mark character
        if (url.toLowerCase().includes('/mark/')) {
          const dot = new PIXI.Graphics()
          dot.beginFill(0x2a1810, 0.9)
          dot.drawCircle(0, 0, Math.max(3, modelW * 0.005))
          dot.endFill()
          dot.x = modelW * 0.58
          dot.y = modelH * 0.285
          model.addChild(dot)
        }

        // Drag to move model position
        const onPointerDown = (e: PointerEvent) => {
          if (!containerRef.current || !modelRef.current) return
          const rect = containerRef.current.getBoundingClientRect()
          const x = e.clientX - rect.left
          const y = e.clientY - rect.top
          const bounds = modelRef.current.getBounds?.()
          if (!bounds || !bounds.contains(x, y)) return
          dragRef.current.active = true
          dragRef.current.startX = e.clientX
          dragRef.current.startY = e.clientY
          dragRef.current.baseOffsetX = positionOffsetRef.current.x
          dragRef.current.baseOffsetY = positionOffsetRef.current.y
          canvas.style.cursor = 'grabbing'
        }

        const onPointerMove = (e: PointerEvent) => {
          if (!dragRef.current.active || !modelRef.current) return
          const dx = e.clientX - dragRef.current.startX
          const dy = e.clientY - dragRef.current.startY
          pendingDragRef.current = {
            x: dragRef.current.baseOffsetX + dx,
            y: dragRef.current.baseOffsetY + dy,
          }

          if (dragFrameRef.current !== null) return
          dragFrameRef.current = window.requestAnimationFrame(() => {
            dragFrameRef.current = null
            const next = pendingDragRef.current
            if (!next || !modelRef.current) return
            positionOffsetRef.current.x = next.x
            positionOffsetRef.current.y = next.y
            applyTransformWithOffset(modelRef.current, baseScaleRef.current * zoomRef.current)
          })
        }

        const onPointerUp = () => {
          if (!dragRef.current.active) return
          dragRef.current.active = false
          pendingDragRef.current = null
          if (dragFrameRef.current !== null) {
            window.cancelAnimationFrame(dragFrameRef.current)
            dragFrameRef.current = null
          }
          canvas.style.cursor = 'default'
          saveCurrentPosition()
        }

        canvas.addEventListener('pointerdown', onPointerDown)
        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)

        ;(app as any).__dragCleanup = () => {
          canvas.removeEventListener('pointerdown', onPointerDown)
          window.removeEventListener('pointermove', onPointerMove)
          window.removeEventListener('pointerup', onPointerUp)
        }

        // Extract expressions and motions
        const expNames: string[] = []
        const motGroups: { name: string; count: number }[] = []
        try {
          const internalModel = model.internalModel
          if (internalModel?.settings) {
            const settings = internalModel.settings as any
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
        onModelLoadedRef.current?.({ expressions: expNames, motionGroups: motGroups })

        // Register lipsync hook on the model's update loop
        if (model.internalModel) {
          // Detect which mouth-open parameter name this model uses
          const cm = model.internalModel.coreModel as any
          const MOUTH_CANDIDATES = [
            'ParamMouthOpenY', 'PARAM_MOUTH_OPEN_Y', 'MouthJawOpen',
            'ParamMouthOpen', 'PARAM_MOUTH_OPEN',
          ]
          let detectedParams: string[] = []
          let useMethod: 'addById' | 'setFloat' = 'addById'

          if (cm?.addParameterValueById) {
            // Cubism 4: enumerate actual parameter IDs
            useMethod = 'addById'
            const ids: string[] = cm._parameterIds || []
            detectedParams = ids.filter((id: string) =>
              /mouth.*open|jaw.*open/i.test(String(id))
            )
            if (detectedParams.length === 0) detectedParams = MOUTH_CANDIDATES
          } else if (cm?.setParamFloat) {
            // Cubism 2: try known names to find which exist
            useMethod = 'setFloat'
            for (const name of MOUTH_CANDIDATES) {
              const idx = cm.getParamIndex?.(name) ?? -1
              if (idx >= 0) { detectedParams.push(name); break }
            }
            if (detectedParams.length === 0) detectedParams = ['PARAM_MOUTH_OPEN_Y']
          }

          model.internalModel.on('beforeModelUpdate', () => {
            const val = mouthOpenRef.current
            if (val <= 0) return
            const cm2 = model.internalModel.coreModel as any
            if (!cm2) return
            if (useMethod === 'addById') {
              for (const p of detectedParams) {
                try { cm2.addParameterValueById(p, val) } catch {}
              }
            } else {
              for (const p of detectedParams) {
                try { cm2.setParamFloat(p, val) } catch {}
              }
            }
          })
        }

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
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current)
        dragFrameRef.current = null
      }
      if (appRef.current) {
        const cleanup = (appRef.current as any).__dragCleanup
        if (cleanup) {
          try { cleanup() } catch {}
        }
        try { appRef.current.destroy(true) } catch {}
        appRef.current = null
      }
      modelRef.current = null
      initedRef.current = false
    }
  }, [applyTransformWithOffset, loadSavedPosition, modelUrl, saveCurrentPosition])

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !appRef.current || !modelRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      sceneSizeRef.current = { w, h }
      appRef.current.renderer.resize(w, h)
      const model = modelRef.current
      const origH = model.height / model.scale.y
      const origW = model.width / model.scale.x
      const newBase = Math.min((h * 0.85) / origH, (w * 0.8) / origW)
      baseScaleRef.current = newBase
      const scale = newBase * zoomRef.current
      applyTransformWithOffset(model, scale)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [applyTransformWithOffset])

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

  // Lipsync: mouth open value is applied in the model's beforeModelUpdate event (registered after model load)

  const startLipsync = useCallback((audio: HTMLAudioElement) => {
    import('@/lib/lipsync').then(({ getLipsyncEngine }) => {
      const engine = getLipsyncEngine()
      lipsyncEngineRef.current = engine
      engine.connectAudio(audio)
      engine.setUpdateCallback((state: LipsyncState) => {
        mouthOpenRef.current = state.mouthOpen
      })
    })
  }, [])

  const stopLipsync = useCallback(() => {
    if (lipsyncEngineRef.current) {
      lipsyncEngineRef.current.disconnect()
      lipsyncEngineRef.current = null
    }
    mouthOpenRef.current = 0
  }, [])

  const updateLipsync = useCallback((state: LipsyncState) => {
    mouthOpenRef.current = state.mouthOpen
  }, [])

  useImperativeHandle(ref, () => ({
    triggerOutfitPreset,
    triggerActionPreset,
    triggerExpression,
    triggerMotion,
    getExpressions: () => expressions,
    getMotionGroups: () => motionGroups,
    startLipsync,
    stopLipsync,
    updateLipsync,
  }), [triggerOutfitPreset, triggerActionPreset, triggerExpression, triggerMotion, expressions, motionGroups, startLipsync, stopLipsync, updateLipsync])

  return (
    <>
    {/* Canvas container - fades in when model loaded */}
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
    />

    {/* UI controls - always visible, separate from canvas opacity */}
    {/* Bottom bar: zoom + actions */}
    {!isLoading && !error && (
        <div style={{
          position: 'fixed', bottom: 16,
          left: 'calc(var(--toolbar-width) + (100vw - var(--toolbar-width) - var(--chat-panel-width)) / 2)',
          transform: 'translateX(-50%)',
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
          <button
            onClick={resetPosition}
            style={{
              padding: '2px 8px', borderRadius: 12, border: 'none',
              background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer', fontSize: 11, transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            title="Reset vị trí"
          >Vị trí</button>

        </div>
      )}

      {!isLoading && !error && (
        <div style={{
          position: 'fixed', top: 12,
          left: 'calc(var(--toolbar-width) + (100vw - var(--toolbar-width) - var(--chat-panel-width)) / 2)',
          transform: 'translateX(-50%)',
          padding: '4px 10px', borderRadius: 999,
          background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.65)', fontSize: 11, zIndex: 8,
          userSelect: 'none',
        }}>
          Giữ và kéo nhân vật để di chuyển
        </div>
      )}

      {/* Enhanced loading overlay */}
      {isLoading && (
        <div style={{
          position: 'fixed',
          top: 0, bottom: 0,
          left: 'var(--toolbar-width)',
          right: 'var(--chat-panel-width)',
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
          position: 'fixed', bottom: 16,
          left: 'calc(var(--toolbar-width) + (100vw - var(--toolbar-width) - var(--chat-panel-width)) / 2)',
          transform: 'translateX(-50%)',
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
    </>
  )
})

export default Live2DCharacter
