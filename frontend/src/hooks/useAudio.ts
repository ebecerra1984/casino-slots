import { useRef, useState, useCallback, useEffect } from 'react'

// ─── helpers ──────────────────────────────────────────────────────────────────

function midiToHz(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function makeNoiseBuf(ctx: AudioContext, secs: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * secs), ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return buf
}

function tone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  t0: number,
  dur: number,
  vol: number,
  type: OscillatorType = 'sine',
) {
  const osc = ctx.createOscillator()
  const g   = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(vol, t0 + 0.02)
  g.gain.setValueAtTime(vol, t0 + Math.max(dur - 0.06, 0.02))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g); g.connect(dest)
  osc.start(t0); osc.stop(t0 + dur + 0.05)
}

// ─── background melody ────────────────────────────────────────────────────────
// 16-note loop, C-major / F-major alternation (~5 s)

const BG: { f: number; d: number }[] = [
  // C major arc
  { f: 523.25, d: 0.27 }, { f: 659.26, d: 0.27 }, { f: 783.99, d: 0.27 }, { f: 1046.50, d: 0.45 },
  { f: 783.99, d: 0.27 }, { f: 659.26, d: 0.27 }, { f: 523.25, d: 0.27 }, { f:  392.00, d: 0.45 },
  // F major arc
  { f: 349.23, d: 0.27 }, { f: 440.00, d: 0.27 }, { f: 523.25, d: 0.27 }, { f:  698.46, d: 0.45 },
  { f: 659.26, d: 0.27 }, { f: 523.25, d: 0.27 }, { f: 440.00, d: 0.27 }, { f:  349.23, d: 0.45 },
]

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useAudio() {
  const ctxRef       = useRef<AudioContext | null>(null)
  const masterRef    = useRef<GainNode | null>(null)
  const noiseRef     = useRef<AudioBuffer | null>(null)
  const spinRef      = useRef<{ src: AudioBufferSourceNode; g: GainNode } | null>(null)
  const bgTimerRef   = useRef<number | null>(null)
  const bgNextRef    = useRef(0)
  const bgIdxRef     = useRef(0)
  const mutedRef     = useRef(false)
  const [muted, setMuted] = useState(false)
  const ready        = useRef(false)  // AudioContext resumed at least once

  // ── internals ──

  function ctx(): AudioContext {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
      const m = ctxRef.current.createGain()
      m.gain.value = 1
      m.connect(ctxRef.current.destination)
      masterRef.current = m
    }
    return ctxRef.current
  }

  function dest(): AudioNode {
    return masterRef.current ?? ctx().destination
  }

  function noise(secs: number): AudioBuffer {
    const c = ctx()
    if (!noiseRef.current || noiseRef.current.duration < secs) {
      noiseRef.current = makeNoiseBuf(c, Math.max(secs + 2, 10))
    }
    return noiseRef.current
  }

  // ── background scheduler ──

  function scheduleBgNote() {
    const c = ctx(); const d = dest()
    const n = BG[bgIdxRef.current]
    const t = bgNextRef.current
    // melody voice (soft sine)
    tone(c, d, n.f,    t, n.d * 0.75, 0.07, 'sine')
    // bass voice  (octave down, triangle, quieter)
    tone(c, d, n.f / 2, t, n.d * 0.6, 0.035, 'triangle')
    bgNextRef.current += n.d
    bgIdxRef.current = (bgIdxRef.current + 1) % BG.length
  }

  function bgLoop() {
    const c = ctx()
    while (bgNextRef.current < c.currentTime + 0.15) scheduleBgNote()
    bgTimerRef.current = window.setTimeout(bgLoop, 30)
  }

  function startBg() {
    if (bgTimerRef.current) return
    bgNextRef.current = ctx().currentTime + 0.08
    bgIdxRef.current  = 0
    bgLoop()
  }

  function stopBg() {
    if (bgTimerRef.current) { clearTimeout(bgTimerRef.current); bgTimerRef.current = null }
  }

  // ── public API ──

  const initAudio = useCallback(async () => {
    const c = ctx()
    if (c.state === 'suspended') await c.resume()
    ready.current = true
    if (!mutedRef.current) startBg()
  }, [])

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
    if (masterRef.current) masterRef.current.gain.value = next ? 0 : 1
    if (next) stopBg(); else if (ready.current) startBg()
  }, [])

  /** Continuous reel whir — call when spin starts */
  const playSpin = useCallback(() => {
    if (mutedRef.current) return
    const c = ctx(); const d = dest()
    const src = c.createBufferSource()
    src.buffer = noise(30); src.loop = true

    const filt = c.createBiquadFilter()
    filt.type = 'bandpass'
    filt.frequency.setValueAtTime(140, c.currentTime)
    filt.frequency.linearRampToValueAtTime(280, c.currentTime + 0.4)
    filt.Q.value = 1.8

    const g = c.createGain()
    g.gain.setValueAtTime(0, c.currentTime)
    g.gain.linearRampToValueAtTime(0.22, c.currentTime + 0.12)

    src.connect(filt); filt.connect(g); g.connect(d)
    src.start()
    spinRef.current = { src, g }
  }, [])

  /** Stop reel whir — call when all reels stopped */
  const stopSpin = useCallback(() => {
    if (!spinRef.current) return
    const c = ctx()
    const { src, g } = spinRef.current
    g.gain.linearRampToValueAtTime(0, c.currentTime + 0.14)
    src.stop(c.currentTime + 0.18)
    spinRef.current = null
  }, [])

  /** Mechanical thud — call for each individual reel stop */
  const playReelStop = useCallback(() => {
    if (mutedRef.current) return
    const c = ctx(); const d = dest()
    const src = c.createBufferSource()
    src.buffer = noise(0.15)

    const filt = c.createBiquadFilter()
    filt.type = 'lowpass'; filt.frequency.value = 320

    const g = c.createGain(); const t = c.currentTime
    g.gain.setValueAtTime(0.45, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)

    src.connect(filt); filt.connect(g); g.connect(d)
    src.start(); src.stop(t + 0.15)
  }, [])

  /**
   * Win jingle — prizeRatio = total_prize / total_bet
   * <3× = small, 3-10× = medium, 10-50× = big, ≥50× = jackpot
   */
  const playWin = useCallback((prizeRatio: number) => {
    if (mutedRef.current) return
    const c = ctx(); const d = dest()
    const now = c.currentTime

    const isJackpot = prizeRatio >= 50
    const isBig     = prizeRatio >= 10
    const isMed     = prizeRatio >= 3

    // MIDI notes: C major arpeggio up
    const midi  = isJackpot ? [60, 64, 67, 72, 76, 79, 84]
                : isBig     ? [60, 64, 67, 72, 76]
                : isMed     ? [60, 64, 67, 72]
                :              [67, 72, 79]          // small — G,C,G

    const step  = isJackpot ? 0.13 : 0.11
    const vol   = isJackpot ? 0.42 : isBig ? 0.36 : 0.28
    const wtype: OscillatorType = isJackpot ? 'triangle' : 'sine'

    midi.forEach((m, i) => tone(c, d, midiToHz(m), now + i * step, 0.4, vol, wtype))

    if (isJackpot) {
      // Final sustained chord
      const ct = now + midi.length * step + 0.1
      ;[60, 64, 67, 72].forEach(m => tone(c, d, midiToHz(m), ct, 1.8, 0.18, 'sine'))

      // Coin-drop noise bursts
      for (let i = 0; i < 8; i++) {
        const t = ct + i * 0.09
        const src = c.createBufferSource(); src.buffer = noise(0.12)
        const f = c.createBiquadFilter(); f.type = 'bandpass'
        f.frequency.value = 700 + Math.random() * 500
        const g = c.createGain()
        g.gain.setValueAtTime(0.18, t)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
        src.connect(f); f.connect(g); g.connect(d)
        src.start(t); src.stop(t + 0.12)
      }
    }
  }, [])

  /** Magical sparkle — call on 3+ scatter trigger */
  const playScatter = useCallback(() => {
    if (mutedRef.current) return
    const c = ctx(); const d = dest()
    const now = c.currentTime
    // Ascending sparkle: C6 → E6 → G6 → C7 → E7
    const midiNotes = [84, 88, 91, 96, 100]
    midiNotes.forEach((m, i) => {
      const t = now + i * 0.09
      tone(c, d, midiToHz(m),         t,        0.32, 0.22, 'sine')
      tone(c, d, midiToHz(m) * 1.006, t + 0.01, 0.26, 0.1,  'sine') // shimmer
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopBg()
      ctxRef.current?.close()
    }
  }, [])

  return { muted, toggleMute, initAudio, playSpin, stopSpin, playReelStop, playWin, playScatter }
}
