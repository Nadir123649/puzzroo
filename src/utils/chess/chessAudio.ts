/**
 * Web Audio API Sound Generator for Chess
 * Provides zero-latency, realistic synthesized sound effects:
 * - Move sound (wooden click)
 * - Capture sound (thud impact)
 * - Check sound (bell alert)
 * - Checkmate sound (triumphant chord)
 * - Promotion sound (chime shimmer)
 * - Persistent Mute State
 */

'use client'

class ChessAudio {
  private audioCtx: AudioContext | null = null
  private isMuted: boolean = false
  private lastPlayTime: Map<string, number> = new Map()
  private readonly SOUND_COOLDOWN = 50 // ms

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('puzzroo_chess_muted')
      this.isMuted = saved === 'true'
    }
  }

  private canPlay(soundId: string): boolean {
    const now = Date.now()
    const last = this.lastPlayTime.get(soundId) || 0
    if (now - last < this.SOUND_COOLDOWN) return false
    this.lastPlayTime.set(soundId, now)
    return true
  }

  private initCtx() {
    if (typeof window === 'undefined') return null
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass()
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {})
    }
    return this.audioCtx
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted
    if (typeof window !== 'undefined') {
      localStorage.setItem('puzzroo_chess_muted', String(this.isMuted))
    }
    return this.isMuted
  }

  public getIsMuted(): boolean {
    return this.isMuted
  }

  public playGameStart() {
    if (this.isMuted || !this.canPlay('start')) return
    const ctx = this.initCtx()
    if (!ctx) return

    const notes = [261.63, 329.63, 392, 523.25] // C4, E4, G4, C5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12)
      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.12 + 0.25)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + idx * 0.12)
      osc.stop(ctx.currentTime + idx * 0.12 + 0.25)
    })
  }

  public playTimerTick() {
    if (this.isMuted || !this.canPlay('tick')) return
    const ctx = this.initCtx()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    gain.gain.setValueAtTime(0.06, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.04)
  }

  public playMove() {
    if (this.isMuted || !this.canPlay('move')) return
    const ctx = this.initCtx()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(150, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08)

    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.08)
  }

  public playCapture() {
    if (this.isMuted || !this.canPlay('capture')) return
    const ctx = this.initCtx()
    if (!ctx) return

    // Noise buffer + low frequency thud
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(320, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.12)

    gain.gain.setValueAtTime(0.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.12)
  }

  public playCheck() {
    if (this.isMuted || !this.canPlay('check')) return
    const ctx = this.initCtx()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08) // A5

    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.25)
  }

  public playPromotion() {
    if (this.isMuted || !this.canPlay('promotion')) return
    const ctx = this.initCtx()
    if (!ctx) return

    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.05)

      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.05)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.05 + 0.15)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime + idx * 0.05)
      osc.stop(ctx.currentTime + idx * 0.05 + 0.15)
    })
  }

  public playCheckmate() {
    if (this.isMuted || !this.canPlay('checkmate')) return
    const ctx = this.initCtx()
    if (!ctx) return

    const notes = [440, 554.37, 659.25, 880] // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1)

      gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.1)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.4)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime + idx * 0.1)
      osc.stop(ctx.currentTime + idx * 0.1 + 0.4)
    })
  }
}

export const chessAudio = new ChessAudio()
export default chessAudio
