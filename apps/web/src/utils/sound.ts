/**
 * Keystroke audio.
 *
 * Clicks are synthesised with the Web Audio API rather than loaded as
 * sample files. This keeps the bundle free of binary assets and makes the
 * click latency effectively zero, which matters when it has to track fast
 * typing.
 *
 * The AudioContext is created lazily on first use because browsers refuse
 * to start one outside a user gesture.
 */

class SoundManager {
  private ctx: AudioContext | null = null
  private volume = 0.3
  private enabled = false

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  setVolume(volume: number): void {
    this.volume = Math.min(Math.max(volume, 0), 1)
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx

    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!Ctor) return null
      this.ctx = new Ctor()
      return this.ctx
    } catch {
      // Audio is a non-essential enhancement; fail silently.
      return null
    }
  }

  /**
   * Play a short percussive click.
   *
   * A triangle oscillator with a steep exponential decay reads as a key
   * press without the ringing tone a pure sine would produce.
   */
  click(variant: "key" | "error" = "key"): void {
    if (!this.enabled) return

    const ctx = this.ensureContext()
    if (!ctx) return

    // Browsers suspend the context when the tab loses focus.
    if (ctx.state === "suspended") void ctx.resume()

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = "triangle"
    // A slight random detune stops repeated keys sounding mechanical.
    const base = variant === "error" ? 180 : 620
    osc.frequency.setValueAtTime(base + (Math.random() * 40 - 20), now)
    osc.frequency.exponentialRampToValueAtTime(base * 0.6, now + 0.03)

    gain.gain.setValueAtTime(this.volume * 0.35, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)

    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.06)
  }
}

export const soundManager = new SoundManager()
