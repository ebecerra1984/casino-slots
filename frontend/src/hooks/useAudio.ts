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

// ─── tick buffer ──────────────────────────────────────────────────────────────
// Un período = 1/15 s (66.7 ms). Los primeros 22 ms son el "click" (ruido con
// decay exponencial); el resto es silencio. Al hacer loop suena como trinquete.

function makeTickBuf(ctx: AudioContext): AudioBuffer {
  const rate      = ctx.sampleRate
  const period    = Math.floor(rate / 15)      // 15 ticks/seg (velocidad normal)
  const clickLen  = Math.floor(rate * 0.022)   // 22 ms de click
  const buf       = ctx.createBuffer(1, period, rate)
  const d         = buf.getChannelData(0)
  for (let i = 0; i < clickLen; i++) {
    const t = i / rate
    // impulso de ruido con decay exponencial muy rápido → sonido de "tac"
    d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 200)
  }
  // el resto del período queda en 0 (silencio entre clicks)
  return buf
}

export function useAudio() {
  const ctxRef       = useRef<AudioContext | null>(null)
  const masterRef    = useRef<GainNode | null>(null)
  const noiseRef     = useRef<AudioBuffer | null>(null)
  const tickBufRef   = useRef<AudioBuffer | null>(null)   // buffer de tick en loop
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

  /**
   * Tick mecánico en loop — llaman cuando arrancan los rodillos.
   * fast=true duplica la velocidad para quick-spin.
   */
  const playSpin = useCallback((fast = false) => {
    if (mutedRef.current) return
    const c = ctx(); const d = dest()

    // Buffer de tick (creado una sola vez)
    if (!tickBufRef.current) tickBufRef.current = makeTickBuf(c)

    const src = c.createBufferSource()
    src.buffer = tickBufRef.current
    src.loop   = true
    // fast: 1.8× → ~27 ticks/s · normal: 1× → 15 ticks/s
    src.playbackRate.value = fast ? 1.8 : 1.0

    // Filtro lowpass: quita el brillo excesivo, deja el golpe seco
    const filt = c.createBiquadFilter()
    filt.type = 'lowpass'
    filt.frequency.value = 900

    const g = c.createGain()
    g.gain.setValueAtTime(0, c.currentTime)
    g.gain.linearRampToValueAtTime(0.55, c.currentTime + 0.08)

    src.connect(filt); filt.connect(g); g.connect(d)
    src.start()
    spinRef.current = { src, g }
  }, [])

  /** Detiene el tick — llaman cuando para el último rodillo */
  const stopSpin = useCallback(() => {
    if (!spinRef.current) return
    const c = ctx()
    const { src, g } = spinRef.current
    g.gain.linearRampToValueAtTime(0, c.currentTime + 0.1)
    src.stop(c.currentTime + 0.12)
    spinRef.current = null
  }, [])

  /**
   * Clunk de enclavamiento — cada rodillo al detenerse.
   * Más grave y largo que el tick de giro: parece que el rodillo "cae" en su posición.
   */
  const playReelStop = useCallback(() => {
    if (mutedRef.current) return
    const c = ctx(); const d = dest()
    const t = c.currentTime

    // Cuerpo principal: ruido grave (lowpass 220 Hz)
    const body = c.createBufferSource()
    body.buffer = noise(0.18)
    const fBody = c.createBiquadFilter(); fBody.type = 'lowpass'; fBody.frequency.value = 220
    const gBody = c.createGain()
    gBody.gain.setValueAtTime(0.7, t)
    gBody.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
    body.connect(fBody); fBody.connect(gBody); gBody.connect(d)
    body.start(t); body.stop(t + 0.18)

    // Transiente agudo corto (ataque inicial): da el "tac" nítido
    const snap = c.createBufferSource()
    snap.buffer = noise(0.03)
    const fSnap = c.createBiquadFilter(); fSnap.type = 'bandpass'; fSnap.frequency.value = 1200; fSnap.Q.value = 2
    const gSnap = c.createGain()
    gSnap.gain.setValueAtTime(0.4, t)
    gSnap.gain.exponentialRampToValueAtTime(0.0001, t + 0.025)
    snap.connect(fSnap); fSnap.connect(gSnap); gSnap.connect(d)
    snap.start(t); snap.stop(t + 0.03)
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
