'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'

export interface VRMCharacterHandle {
  triggerEmotion: (emotion: string) => void
}

interface VRMCharacterProps {
  modelUrl: string
  onModelLoaded?: () => void
}

const VRMCharacter = forwardRef<VRMCharacterHandle, VRMCharacterProps>(
  function VRMCharacter({ modelUrl, onModelLoaded }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const rendererRef = useRef<any>(null)
    const sceneRef = useRef<any>(null)
    const cameraRef = useRef<any>(null)
    const controlsRef = useRef<any>(null)
    const vrmRef = useRef<any>(null)
    const clockRef = useRef<any>(null)
    const mixerRef = useRef<any>(null)
    const animFrameRef = useRef<number>(0)
    const onModelLoadedRef = useRef(onModelLoaded)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [loadProgress, setLoadProgress] = useState('')

    onModelLoadedRef.current = onModelLoaded

    useImperativeHandle(ref, () => ({
      triggerEmotion: (emotion: string) => {
        const vrm = vrmRef.current
        if (!vrm?.expressionManager) return
        // Reset all
        const names = vrm.expressionManager.expressions?.map((e: any) => e.expressionName) || []
        names.forEach((n: string) => vrm.expressionManager.setValue(n, 0))
        // Set the requested one
        const map: Record<string, string> = {
          happy: 'happy', sad: 'sad', angry: 'angry',
          surprised: 'surprised', neutral: 'neutral', relaxed: 'relaxed',
          fun: 'fun', joy: 'happy', smile: 'happy',
        }
        const expr = map[emotion.toLowerCase()] || emotion
        vrm.expressionManager.setValue(expr, 1)
      },
    }))

    useEffect(() => {
      if (!containerRef.current) return
      let cancelled = false

      const init = async () => {
        try {
          setIsLoading(true)
          setError(null)
          setLoadProgress('Đang tải Three.js...')

          const THREE = await import('three')
          if (cancelled) return

          const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
          const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
          const { VRMLoaderPlugin } = await import('@pixiv/three-vrm')
          if (cancelled) return

          const container = containerRef.current!
          const width = container.clientWidth || window.innerWidth
          const height = container.clientHeight || window.innerHeight

          // Scene
          const scene = new THREE.Scene()
          sceneRef.current = scene

          // Camera
          const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 20)
          camera.position.set(0, 1.2, 3)
          camera.lookAt(0, 1, 0)
          cameraRef.current = camera

          // Renderer
          const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
          renderer.setSize(width, height)
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
          renderer.outputColorSpace = THREE.SRGBColorSpace
          container.appendChild(renderer.domElement)
          rendererRef.current = renderer

          // Lighting
          const ambient = new THREE.AmbientLight(0xffffff, 0.8)
          scene.add(ambient)
          const directional = new THREE.DirectionalLight(0xffffff, 0.6)
          directional.position.set(1, 2, 3)
          scene.add(directional)

          // OrbitControls for zoom/rotate
          const controls = new OrbitControls(camera, renderer.domElement)
          controls.target.set(0, 1, 0)
          controls.enableDamping = true
          controls.dampingFactor = 0.1
          controls.minDistance = 1
          controls.maxDistance = 10
          controls.maxPolarAngle = Math.PI * 0.85
          controls.update()
          controlsRef.current = controls

          // Clock
          const clock = new THREE.Clock()
          clockRef.current = clock

          // Load model (VRM or GLB)
          setLoadProgress('Đang tải mô hình 3D...')
          const loader = new GLTFLoader()
          const isGLB = modelUrl.toLowerCase().endsWith('.glb')

          // Only register VRM plugin for .vrm files
          if (!isGLB) {
            loader.register((parser: any) => new VRMLoaderPlugin(parser))
          }

          const gltf = await loader.loadAsync(modelUrl, (progress) => {
            if (progress.total > 0) {
              const pct = Math.round((progress.loaded / progress.total) * 100)
              setLoadProgress(`Đang tải: ${pct}%`)
            }
          })

          if (cancelled) return

          if (isGLB) {
            // GLB model: plain glTF scene
            const model = gltf.scene
            // Auto-center and scale the model
            const box = new THREE.Box3().setFromObject(model)
            const size = new THREE.Vector3()
            const center = new THREE.Vector3()
            box.getSize(size)
            box.getCenter(center)
            const maxDim = Math.max(size.x, size.y, size.z)
            const scale = 2.0 / maxDim
            model.scale.setScalar(scale)
            // Re-center after scaling
            box.setFromObject(model)
            box.getCenter(center)
            model.position.sub(center)
            model.position.y += size.y * scale / 2

            scene.add(model)

            // Play animations if available
            const mixer = new THREE.AnimationMixer(model)
            mixerRef.current = mixer
            if (gltf.animations.length > 0) {
              gltf.animations.forEach((clip: any) => {
                mixer.clipAction(clip).play()
              })
            }

            // Adjust camera for GLB
            camera.position.set(0, 1.2, 3.5)
            controls.target.set(0, 1, 0)
            controls.update()

            vrmRef.current = null // No VRM data for GLB
          } else {
            // VRM model
            const vrm = gltf.userData.vrm
            if (!vrm) {
              setError('Không phải file VRM hợp lệ')
              return
            }
            vrmRef.current = vrm

            // Rotate to face camera (VRM default faces +Z)
            vrm.scene.rotation.y = Math.PI
            scene.add(vrm.scene)

            // Setup idle animation
            const mixer = new THREE.AnimationMixer(vrm.scene)
            mixerRef.current = mixer
          }

          setIsLoading(false)
          setLoadProgress('')
          onModelLoadedRef.current?.()

          // Animate
          const animate = () => {
            if (cancelled) return
            animFrameRef.current = requestAnimationFrame(animate)
            const delta = clock.getDelta()

            // Auto blink (VRM only)
            const vrm = vrmRef.current
            if (vrm?.expressionManager) {
              const blinkPhase = Math.sin(clock.elapsedTime * 3) > 0.95
              vrm.expressionManager.setValue('blink', blinkPhase ? 1 : 0)
            }

            controls.update()
            if (vrm) vrm.update(delta)
            mixerRef.current?.update(delta)
            renderer.render(scene, camera)
          }
          animate()

          // Handle resize
          const onResize = () => {
            if (!container || cancelled) return
            const w = container.clientWidth
            const h = container.clientHeight
            camera.aspect = w / h
            camera.updateProjectionMatrix()
            renderer.setSize(w, h)
          }
          window.addEventListener('resize', onResize)
          ;(container as any).__resizeCleanup = () => window.removeEventListener('resize', onResize)

        } catch (err: any) {
          if (!cancelled) {
            console.error('VRM load error:', err)
            setError(`Lỗi tải mô hình: ${err.message}`)
            setIsLoading(false)
          }
        }
      }

      init()

      return () => {
        cancelled = true
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        const container = containerRef.current
        if (container) {
          (container as any).__resizeCleanup?.()
        }
        controlsRef.current?.dispose()
        rendererRef.current?.dispose()
        rendererRef.current?.domElement?.remove()
      }
    }, [modelUrl])

    return (
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
        }}
      >
        {isLoading && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8,
          }}>
            <div style={{
              width: 40, height: 40, border: '3px solid rgba(99,102,241,0.3)',
              borderTopColor: '#6366f1', borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              {loadProgress || 'Đang tải...'}
            </span>
          </div>
        )}
        {error && (
          <div style={{
            position: 'absolute', bottom: 120, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: '8px 16px', color: '#fca5a5', fontSize: 13,
          }}>
            {error}
          </div>
        )}
      </div>
    )
  }
)

export default VRMCharacter
