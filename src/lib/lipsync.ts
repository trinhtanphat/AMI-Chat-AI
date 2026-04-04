/**
 * Lipsync Engine - Real-time audio analysis for mouth animation
 * 
 * Analyzes audio volume to drive mouth open/close animation.
 * For VRM: maps to viseme blendshapes (aa, ih, ou, ee, oh)
 * For GLB: drives jaw bone or morph target if available
 * 
 * Architecture:
 *   Audio (TTS/browser) → AudioContext → AnalyserNode → volume → viseme mapping → blendshape values
 */

// Viseme types matching VRM standard expressions
export type Viseme = 'aa' | 'ih' | 'ou' | 'ee' | 'oh' | 'sil'

export interface LipsyncState {
  volume: number        // 0-1 normalized audio volume
  viseme: Viseme        // Current detected viseme
  mouthOpen: number     // 0-1 mouth openness
  values: {             // Individual viseme weights (0-1)
    aa: number
    ih: number
    ou: number
    ee: number
    oh: number
  }
}

const SILENT_STATE: LipsyncState = {
  volume: 0,
  viseme: 'sil',
  mouthOpen: 0,
  values: { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 },
}

export class LipsyncEngine {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private dataArray: Uint8Array<ArrayBuffer> | null = null
  private source: MediaElementAudioSourceNode | null = null
  private currentAudio: HTMLAudioElement | null = null
  private isActive = false
  private smoothVolume = 0
  private visemePhase = 0
  private onUpdate: ((state: LipsyncState) => void) | null = null

  /**
   * Set callback for lipsync state updates (called each frame)
   */
  setUpdateCallback(cb: (state: LipsyncState) => void) {
    this.onUpdate = cb
  }

  /**
   * Connect to an HTMLAudioElement and start analyzing
   */
  connectAudio(audio: HTMLAudioElement): void {
    this.disconnect()

    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext()
      }

      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      this.analyser.smoothingTimeConstant = 0.8

      this.source = this.audioContext.createMediaElementSource(audio)
      this.source.connect(this.analyser)
      this.analyser.connect(this.audioContext.destination)

      const bufferLength = this.analyser.frequencyBinCount
      this.dataArray = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>

      this.currentAudio = audio
      this.isActive = true
      this.visemePhase = 0

      // Start analysis loop
      this.analyze()
    } catch (err) {
      console.warn('[Lipsync] Failed to connect audio:', err)
    }
  }

  /**
   * Connect to browser SpeechSynthesis utterance
   * Since SpeechSynthesisUtterance doesn't provide audio stream,
   * we simulate lipsync based on text timing
   */
  connectSpeechSynthesis(utterance: SpeechSynthesisUtterance, text: string): void {
    this.disconnect()
    this.isActive = true

    const totalDuration = text.length * 80 // ~80ms per character estimate
    const startTime = Date.now()

    const simulate = () => {
      if (!this.isActive) return

      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / totalDuration, 1)

      if (progress >= 1) {
        this.onUpdate?.(SILENT_STATE)
        this.isActive = false
        return
      }

      // Simulate mouth movement based on text position
      const charIndex = Math.floor(progress * text.length)
      const char = text[charIndex]?.toLowerCase() || ''
      const state = this.charToViseme(char, elapsed)
      this.onUpdate?.(state)

      requestAnimationFrame(simulate)
    }

    utterance.onstart = () => {
      this.isActive = true
      simulate()
    }
    utterance.onend = () => {
      this.isActive = false
      this.onUpdate?.(SILENT_STATE)
    }
    utterance.onerror = () => {
      this.isActive = false
      this.onUpdate?.(SILENT_STATE)
    }
  }

  /**
   * Disconnect and clean up
   */
  disconnect(): void {
    this.isActive = false
    try {
      this.source?.disconnect()
    } catch {}
    this.source = null
    this.currentAudio = null
    this.onUpdate?.(SILENT_STATE)
  }

  /**
   * Get current lipsync state (for polling mode)
   */
  getState(): LipsyncState {
    if (!this.isActive || !this.analyser || !this.dataArray) {
      return SILENT_STATE
    }

    this.analyser.getByteFrequencyData(this.dataArray)
    return this.computeState()
  }

  /**
   * Destroy the engine and release resources
   */
  destroy(): void {
    this.disconnect()
    try {
      this.audioContext?.close()
    } catch {}
    this.audioContext = null
    this.analyser = null
    this.dataArray = null
    this.onUpdate = null
  }

  // --- Private methods ---

  private analyze = () => {
    if (!this.isActive || !this.analyser || !this.dataArray) return

    this.analyser.getByteFrequencyData(this.dataArray)
    const state = this.computeState()
    this.onUpdate?.(state)

    if (this.currentAudio && !this.currentAudio.paused && !this.currentAudio.ended) {
      requestAnimationFrame(this.analyze)
    } else if (this.currentAudio?.ended) {
      this.onUpdate?.(SILENT_STATE)
      this.isActive = false
    } else {
      requestAnimationFrame(this.analyze)
    }
  }

  private computeState(): LipsyncState {
    if (!this.dataArray) return SILENT_STATE

    // Calculate volume from frequency data
    let sum = 0
    const len = this.dataArray.length
    for (let i = 0; i < len; i++) {
      sum += this.dataArray[i]
    }
    const rawVolume = sum / (len * 255)

    // Smooth the volume to avoid jitter
    this.smoothVolume = this.smoothVolume * 0.6 + rawVolume * 0.4

    // Normalize and clamp
    const volume = Math.min(Math.max(this.smoothVolume * 3, 0), 1)
    const mouthOpen = volume

    // Generate pseudo-visemes from frequency bands
    // Low freq (0-30%): aa/oh (open vowels)
    // Mid freq (30-60%): ee/ih (mid vowels)  
    // High freq (60-100%): consonants (mouth more closed)
    const lowBand = this.getBandEnergy(0, 0.3)
    const midBand = this.getBandEnergy(0.3, 0.6)
    const highBand = this.getBandEnergy(0.6, 1.0)

    // Cycle through visemes for natural movement
    this.visemePhase += 0.15
    const cycleVal = Math.sin(this.visemePhase)

    let viseme: Viseme = 'sil'
    const values = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 }

    if (volume > 0.05) {
      // Map frequency bands to viseme weights
      const total = lowBand + midBand + highBand + 0.001
      const lowRatio = lowBand / total
      const midRatio = midBand / total

      // Primary viseme based on dominant frequency band + cycling
      if (lowRatio > 0.5) {
        // Low frequency dominant → open vowels
        if (cycleVal > 0.3) {
          values.aa = volume * 0.8
          values.oh = volume * 0.3
          viseme = 'aa'
        } else {
          values.oh = volume * 0.7
          values.aa = volume * 0.2
          viseme = 'oh'
        }
      } else if (midRatio > 0.4) {
        // Mid frequency dominant → mid vowels
        if (cycleVal > 0) {
          values.ee = volume * 0.7
          values.ih = volume * 0.3
          viseme = 'ee'
        } else {
          values.ih = volume * 0.6
          values.ee = volume * 0.2
          viseme = 'ih'
        }
      } else {
        // High frequency → consonant-like, less mouth opening
        values.ou = volume * 0.5
        values.ih = volume * 0.2
        viseme = 'ou'
      }

      // Add natural variation
      const jitter = Math.sin(this.visemePhase * 2.3) * 0.1
      values.aa = Math.max(0, values.aa + jitter)
      values.oh = Math.max(0, values.oh - jitter * 0.5)
    }

    return { volume, viseme, mouthOpen, values }
  }

  private getBandEnergy(startRatio: number, endRatio: number): number {
    if (!this.dataArray) return 0
    const len = this.dataArray.length
    const start = Math.floor(startRatio * len)
    const end = Math.floor(endRatio * len)
    let sum = 0
    for (let i = start; i < end; i++) {
      sum += this.dataArray[i]
    }
    return sum / ((end - start) * 255)
  }

  private charToViseme(char: string, elapsed: number): LipsyncState {
    const vowelMap: Record<string, Viseme> = {
      'a': 'aa', 'ă': 'aa', 'â': 'aa',
      'e': 'ee', 'ê': 'ee',
      'i': 'ih', 'y': 'ih',
      'o': 'oh', 'ô': 'oh', 'ơ': 'oh',
      'u': 'ou', 'ư': 'ou',
    }

    const viseme = vowelMap[char] || 'sil'
    const isVowel = viseme !== 'sil'

    // Natural oscillation
    const wave = Math.sin(elapsed * 0.012) * 0.3 + 0.7
    const mouthOpen = isVowel ? wave * 0.8 : wave * 0.2

    const values = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 }
    if (isVowel) {
      values[viseme as keyof typeof values] = mouthOpen
    }

    return { volume: mouthOpen, viseme, mouthOpen, values }
  }
}

// Singleton instance
let lipsyncInstance: LipsyncEngine | null = null

export function getLipsyncEngine(): LipsyncEngine {
  if (!lipsyncInstance) {
    lipsyncInstance = new LipsyncEngine()
  }
  return lipsyncInstance
}
