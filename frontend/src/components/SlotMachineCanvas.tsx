import { useEffect, useRef } from 'react'
import { useSlotMachine } from '../hooks/useSlotMachine'
import { useAudio } from '../hooks/useAudio'
import type { SessionData, SymbolId, SpinResponse } from '../types'

// ── Symbol config ─────────────────────────────────────────────────────────────

const LABEL: Record<SymbolId, string> = {
  '7': '7', 'BAR': 'BAR', 'BELL': '🔔',
  'CHERRY': '🍒', 'LEMON': '🍋', 'ORANGE': '🍊',
  'GRAPE': '🍇', 'SCATTER': '⭐',
}
const SYM_BG: Record<SymbolId, string> = {
  '7': '#450a0a', 'BAR': '#18181b', 'BELL': '#18181b',
  'CHERRY': '#4a0d25', 'LEMON': '#18181b', 'ORANGE': '#431407',
  'GRAPE': '#2e1065', 'SCATTER': '#083344',
}
const SYM_FG: Record<SymbolId, string> = {
  '7': '#fca5a5', 'BAR': '#d4d4d4', 'BELL': '#fde68a',
  'CHERRY': '#fda4af', 'LEMON': '#fef08a', 'ORANGE': '#fed7aa',
  'GRAPE': '#d8b4fe', 'SCATTER': '#a5f3fc',
}
const WIN_COLOR: Record<number, string> = {
  1: '#facc15', 2: '#34d399', 3: '#f472b6', 4: '#60a5fa', 5: '#fb923c',
}
const PAYLINE_ROWS: Record<number, number[]> = {
  1: [1,1,1,1,1], 2: [0,0,0,0,0], 3: [2,2,2,2,2],
  4: [0,1,2,1,0], 5: [2,1,0,1,2],
}
const POOL: SymbolId[] = ['CHERRY','LEMON','ORANGE','GRAPE','BELL','BAR','7','SCATTER']

// ── Canvas layout ─────────────────────────────────────────────────────────────

const W     = 400
const COLS  = 5
const ROWS  = 3
const CELL  = 62
const GAP   = 5
const STRIP = CELL + GAP  // 67

// Reel panel
const PNL_X = 10, PNL_Y = 50, PNL_W = 380, PNL_H = 218
const REEL_X = PNL_X + (PNL_W - (COLS * CELL + (COLS - 1) * GAP)) / 2  // 35
const REEL_Y = PNL_Y + (PNL_H - (ROWS * CELL + (ROWS - 1) * GAP)) / 2  // ~61
const REEL_CLIP_H = ROWS * CELL + (ROWS - 1) * GAP  // 196

// UI zones below panel
const BAL_Y   = PNL_Y + PNL_H + 6      // 274
const WIN_Y   = BAL_Y  + 42 + 4        // 320
const BET_Y   = WIN_Y  + 30 + 8        // 358
const SPIN_Y  = BET_Y  + 44 + 10       // 412
const SPIN_H  = 54
const AUTO_Y  = SPIN_Y + SPIN_H + 8    // 474
const H       = AUTO_Y + 40 + 10       // 524

// Bet buttons
const BETS    = [1, 3, 5, 10, 25]
const BBW     = 54, BBH = 44, BBG = 6
const BB_X0   = (W - (BETS.length * BBW + (BETS.length - 1) * BBG)) / 2  // 53

// Auto buttons
const AUTO_COUNTS = [5, 10, 25]
const ABW = 62, ABH = 38, ABG = 8
const AB_X0 = W - (AUTO_COUNTS.length * ABW + (AUTO_COUNTS.length - 1) * ABG) - 14

const MUTE_R  = { x: 12, y: 10,  w: 32, h: 32 }
const SPIN_R  = { x: (W - 180) / 2, y: SPIN_Y, w: 180, h: SPIN_H }
const QUICK_R = { x: 14, y: AUTO_Y + 1, w: 76, h: ABH }

type Rect = { x: number; y: number; w: number; h: number }
const BET_RS  = BETS.map((b, i) => ({ x: BB_X0 + i*(BBW+BBG), y: BET_Y, w: BBW, h: BBH, v: b }))
const AUTO_RS = AUTO_COUNTS.map((c, i) => ({ x: AB_X0 + i*(ABW+ABG), y: AUTO_Y+1, w: ABW, h: ABH, v: c }))
const STOP_R  = { x: AB_X0, y: AUTO_Y+1, w: ABW*3 + ABG*2, h: ABH }

function hit(px: number, py: number, r: Rect) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h
}

// ── Animation ─────────────────────────────────────────────────────────────────

type ColAnim = { topIdx: number; yOffset: number; wasSpinning: boolean; bounceT: number }

function shuffledPool() {
  const p = [...POOL, ...POOL, ...POOL]
  for (let i = p.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]]
  }
  return p
}

// ── Drawing primitives ────────────────────────────────────────────────────────

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r)
}

function drawSymCell(ctx: CanvasRenderingContext2D, sym: SymbolId, x: number, y: number, hl?: string) {
  rr(ctx, x, y, CELL, CELL, 6)
  ctx.fillStyle = SYM_BG[sym]
  ctx.fill()
  ctx.strokeStyle = '#ffffff10'
  ctx.lineWidth = 1
  rr(ctx, x+0.5, y+0.5, CELL-1, CELL-1, 6)
  ctx.stroke()

  const isText = sym === '7' || sym === 'BAR'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle    = SYM_FG[sym]
  ctx.font         = isText ? `bold ${Math.round(CELL*.35)}px system-ui` : `${Math.round(CELL*.50)}px system-ui`
  ctx.fillText(LABEL[sym], x + CELL/2, y + CELL/2 + (isText ? 0 : 1))

  if (hl) {
    ctx.shadowColor = hl; ctx.shadowBlur = 14
    ctx.strokeStyle = hl; ctx.lineWidth = 2.5
    rr(ctx, x, y, CELL, CELL, 6); ctx.stroke()
    ctx.shadowBlur = 0
  }
}

function drawBtn(
  ctx: CanvasRenderingContext2D,
  r: Rect, label: string,
  bg: string, fg: string, border: string,
  radius = 8, fontSize = 13, disabled = false,
) {
  ctx.globalAlpha = disabled ? 0.35 : 1
  rr(ctx, r.x, r.y, r.w, r.h, radius)
  ctx.fillStyle = bg; ctx.fill()
  ctx.strokeStyle = border; ctx.lineWidth = 1.5
  rr(ctx, r.x, r.y, r.w, r.h, radius); ctx.stroke()
  ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = `600 ${fontSize}px system-ui`
  ctx.fillText(label, r.x + r.w/2, r.y + r.h/2)
  ctx.globalAlpha = 1
}

function fmtCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2,
  }).format(amount)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SlotMachineCanvas({ session }: { session: SessionData | null }) {
  const { state, spin, setBet, startAutoSpin, stopAutoSpin, toggleQuickSpin } =
    useSlotMachine({ initialBalance: session?.balance, sessionToken: session?.session_token })

  const audio    = useAudio()
  const stateRef = useRef(state)
  stateRef.current = state
  const audioRef = useRef(audio)
  audioRef.current = audio

  // Stable action refs so RAF handlers never stale
  const spinRef         = useRef(spin);         spinRef.current         = spin
  const setBetRef       = useRef(setBet);        setBetRef.current       = setBet
  const startAutoRef    = useRef(startAutoSpin); startAutoRef.current    = startAutoSpin
  const stopAutoRef     = useRef(stopAutoSpin);  stopAutoRef.current     = stopAutoSpin
  const toggleQuickRef  = useRef(toggleQuickSpin); toggleQuickRef.current = toggleQuickSpin

  // Audio side-effects via refs (no effect deps on audio fns)
  const prevSpinRef    = useRef(false)
  const prevStoppedRef = useRef(COLS)
  const sessionRef     = useRef(session)
  sessionRef.current   = session

  // ── Canvas setup + RAF loop ───────────────────────────────────────────────
  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const rafRef         = useRef(0)
  const pools          = useRef<SymbolId[][]>(Array.from({ length: COLS }, shuffledPool))
  const colAnims       = useRef<ColAnim[]>(
    Array.from({ length: COLS }, () => ({ topIdx: 0, yOffset: 0, wasSpinning: false, bounceT: 1 }))
  )
  const prevGlobalSpin = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current!
    const dpr = window.devicePixelRatio || 1
    canvas.width  = W * dpr
    canvas.height = H * dpr
    canvas.style.width  = `${W}px`
    canvas.style.height = `${H}px`
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    // ── Events ──────────────────────────────────────────────────────────────
    canvas.addEventListener('click', e => {
      audioRef.current.initAudio()
      const rect = canvas.getBoundingClientRect()
      const px = (e.clientX - rect.left) * (W / rect.width)
      const py = (e.clientY - rect.top)  * (H / rect.height)
      const s  = stateRef.current

      if (hit(px, py, MUTE_R))  { audioRef.current.toggleMute(); return }

      if (hit(px, py, SPIN_R)) {
        if (s.autoSpinsLeft > 0) stopAutoRef.current()
        else if (!s.spinning)   spinRef.current()
        return
      }
      if (s.spinning) return

      for (const r of BET_RS)  { if (hit(px, py, r)) { setBetRef.current(r.v); return } }
      if (hit(px, py, QUICK_R)) { toggleQuickRef.current(); return }
      if (s.autoSpinsLeft > 0 && hit(px, py, STOP_R)) { stopAutoRef.current(); return }
      if (s.autoSpinsLeft === 0)
        for (const r of AUTO_RS) { if (hit(px, py, r)) { startAutoRef.current(r.v); return } }
    })

    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect()
      const px = (e.clientX - rect.left) * (W / rect.width)
      const py = (e.clientY - rect.top)  * (H / rect.height)
      const s  = stateRef.current
      const isHover =
        hit(px, py, MUTE_R) || hit(px, py, SPIN_R) || hit(px, py, QUICK_R) ||
        (!s.spinning && BET_RS.some(r => hit(px, py, r))) ||
        (!s.spinning && AUTO_RS.some(r => hit(px, py, r)))
      canvas.style.cursor = isHover ? 'pointer' : 'default'
    })

    // ── RAF loop ─────────────────────────────────────────────────────────────
    let lastT = performance.now()

    const loop = (now: number) => {
      const dt = Math.min((now - lastT) / 1000, 0.05)
      lastT = now

      const s = stateRef.current
      const { spinning, stoppedCols, quickSpin, matrix, lastResult,
              bet, balance, lines, freeSpinsLeft, autoSpinsLeft, error } = s
      const currency = sessionRef.current?.currency ?? 'USD'
      const playerId = sessionRef.current?.player_id ?? ''

      // ── Audio side-effects ─────────────────────────────────────────────
      const wasSpinning = prevSpinRef.current
      if (spinning && !wasSpinning) audioRef.current.playSpin(quickSpin)
      if (!spinning && wasSpinning) {
        audioRef.current.stopSpin()
        if (lastResult) {
          const ratio = bet * lines > 0 ? lastResult.total_prize / (bet * lines) : 0
          if (lastResult.scatter_count >= 3) {
            audioRef.current.playScatter()
            if (lastResult.is_win) setTimeout(() => audioRef.current.playWin(ratio), 700)
          } else if (lastResult.is_win) audioRef.current.playWin(ratio)
        }
      }
      prevSpinRef.current = spinning

      if (stoppedCols > prevStoppedRef.current && stoppedCols <= COLS)
        audioRef.current.playReelStop()
      prevStoppedRef.current = stoppedCols

      // ── Reel animation ─────────────────────────────────────────────────
      if (spinning && !prevGlobalSpin.current) {
        pools.current = Array.from({ length: COLS }, shuffledPool)
        for (const a of colAnims.current) {
          a.topIdx = Math.floor(Math.random() * POOL.length * 3)
          a.yOffset = 0; a.bounceT = 1
        }
      }
      prevGlobalSpin.current = spinning

      const spd = quickSpin ? 1500 : 560
      for (let col = 0; col < COLS; col++) {
        const a    = colAnims.current[col]
        const pool = pools.current[col]
        const isc  = spinning && col >= stoppedCols
        if (a.wasSpinning && !isc) { a.bounceT = 0; a.yOffset = 0 }
        a.wasSpinning = isc
        if (isc) {
          a.yOffset += spd * dt
          while (a.yOffset >= STRIP) { a.yOffset -= STRIP; a.topIdx = (a.topIdx - 1 + pool.length) % pool.length }
        } else if (a.bounceT < 1) a.bounceT = Math.min(1, a.bounceT + dt * 5)
      }

      // ── Win cells ──────────────────────────────────────────────────────
      const winCells = new Map<string, string>()
      if (lastResult) {
        for (const lr of lastResult.line_results) {
          const rows = PAYLINE_ROWS[lr.line_id]; const color = WIN_COLOR[lr.line_id] ?? '#facc15'
          for (let col = 0; col < lr.match_count; col++) winCells.set(`${col},${rows[col]}`, color)
        }
      }

      // ══ DRAW ═══════════════════════════════════════════════════════════

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
      bgGrad.addColorStop(0, '#0f172a'); bgGrad.addColorStop(1, '#030712')
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H)

      // ── Header ─────────────────────────────────────────────────────────
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = '#facc15'; ctx.font = 'bold 18px system-ui'
      ctx.fillText('🎰  SLOTS', W/2, 27)

      // Mute button
      rr(ctx, MUTE_R.x, MUTE_R.y, MUTE_R.w, MUTE_R.h, 999)
      ctx.fillStyle = '#1f2937'; ctx.fill()
      ctx.strokeStyle = '#374151'; ctx.lineWidth = 1
      rr(ctx, MUTE_R.x, MUTE_R.y, MUTE_R.w, MUTE_R.h, 999); ctx.stroke()
      ctx.font = '15px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = audioRef.current.muted ? '#6b7280' : '#9ca3af'
      ctx.fillText(audioRef.current.muted ? '🔇' : '🔊', MUTE_R.x + MUTE_R.w/2, MUTE_R.y + MUTE_R.h/2)

      if (playerId) {
        ctx.textAlign = 'right'; ctx.font = '10px system-ui'; ctx.fillStyle = '#374151'
        ctx.fillText(playerId, W - 12, 22)
        ctx.fillStyle = '#1f2937'
        ctx.fillText(currency, W - 12, 36)
      }

      // ── Reel panel ─────────────────────────────────────────────────────
      const pGrad = ctx.createLinearGradient(0, PNL_Y, 0, PNL_Y + PNL_H)
      pGrad.addColorStop(0, '#111827'); pGrad.addColorStop(1, '#0f172a')
      rr(ctx, PNL_X, PNL_Y, PNL_W, PNL_H, 14)
      ctx.fillStyle = pGrad; ctx.fill()
      ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 1.5
      rr(ctx, PNL_X, PNL_Y, PNL_W, PNL_H, 14); ctx.stroke()

      for (let col = 0; col < COLS; col++) {
        const a     = colAnims.current[col]
        const pool  = pools.current[col]
        const colX  = REEL_X + col * (CELL + GAP)
        const isc   = spinning && col >= stoppedCols

        if (isc) {
          ctx.save()
          ctx.beginPath(); ctx.rect(colX, REEL_Y, CELL, REEL_CLIP_H); ctx.clip()
          for (let i = -1; i < ROWS; i++) {
            const si   = ((a.topIdx + i) % pool.length + pool.length) % pool.length
            const cellY = REEL_Y + i * STRIP + a.yOffset
            const cy    = cellY + CELL/2
            const edge  = Math.min(cy - REEL_Y, (REEL_Y + REEL_CLIP_H) - cy)
            ctx.globalAlpha = Math.max(0.2, Math.min(1, edge / (CELL * 0.7)))
            drawSymCell(ctx, pool[si], colX, cellY)
          }
          ctx.globalAlpha = 1; ctx.restore()
        } else {
          const by = a.bounceT < 1 ? Math.sin(a.bounceT * Math.PI) * 8 : 0
          for (let row = 0; row < ROWS; row++) {
            const sym = matrix[row]?.[col]; if (!sym) continue
            drawSymCell(ctx, sym, colX, REEL_Y + row * STRIP + by, winCells.get(`${col},${row}`))
          }
        }
      }

      // Free spins badge inside panel
      if (freeSpinsLeft > 0) {
        ctx.textAlign = 'center'; ctx.font = 'bold 12px system-ui'
        ctx.fillStyle = '#facc15'
        ctx.fillText(`⭐ ${freeSpinsLeft} GIROS GRATIS`, W/2, PNL_Y + PNL_H - 10)
      }

      // ── Balance bar ────────────────────────────────────────────────────
      ctx.textAlign = 'left'; ctx.font = '10px system-ui'; ctx.fillStyle = '#4b5563'
      ctx.fillText('SALDO', 14, BAL_Y + 7)
      ctx.font = 'bold 19px system-ui'; ctx.fillStyle = '#facc15'
      ctx.fillText(fmtCurrency(balance, currency), 14, BAL_Y + 30)

      ctx.textAlign = 'right'; ctx.font = '10px system-ui'; ctx.fillStyle = '#4b5563'
      ctx.fillText('APUESTA TOTAL', W - 14, BAL_Y + 7)
      ctx.font = 'bold 19px system-ui'; ctx.fillStyle = '#e5e7eb'
      ctx.fillText(fmtCurrency(bet * lines, currency), W - 14, BAL_Y + 30)

      // ── Win / error display ────────────────────────────────────────────
      if (error) {
        ctx.textAlign = 'center'; ctx.font = '13px system-ui'; ctx.fillStyle = '#f87171'
        ctx.fillText(error, W/2, WIN_Y + 15)
      } else if (lastResult?.is_win) {
        const pulse = 0.75 + 0.25 * Math.sin(Date.now() / 220)
        ctx.shadowColor = '#facc15'; ctx.shadowBlur = 14 * pulse
        ctx.textAlign = 'center'; ctx.font = 'bold 20px system-ui'; ctx.fillStyle = '#facc15'
        ctx.fillText(`✨  PREMIO: ${fmtCurrency(lastResult.total_prize, currency)}  ✨`, W/2, WIN_Y + 15)
        ctx.shadowBlur = 0
      }

      // ── Bet buttons ────────────────────────────────────────────────────
      ctx.textAlign = 'left'; ctx.font = '10px system-ui'; ctx.fillStyle = '#4b5563'
      ctx.fillText('APUESTA POR LÍNEA', BB_X0, BET_Y - 9)
      for (const r of BET_RS) {
        const active = r.v === bet
        drawBtn(ctx, r, String(r.v),
          active ? '#14532d' : '#1f2937',
          active ? '#4ade80' : '#9ca3af',
          active ? '#16a34a' : '#374151',
          7, 15, spinning)
      }

      // ── Spin button ────────────────────────────────────────────────────
      const isAutoOn  = autoSpinsLeft > 0
      const isFree    = freeSpinsLeft > 0
      const spinLabel = spinning ? '⟳  GIRANDO…'
        : isAutoOn   ? `AUTO  ×${autoSpinsLeft}`
        : isFree     ? '⭐  GIRAR GRATIS'
        : 'GIRAR'

      // Shadow (3D effect)
      rr(ctx, SPIN_R.x, SPIN_R.y + 4, SPIN_R.w, SPIN_R.h, 10)
      ctx.fillStyle = spinning ? '#1f2937' : '#78350f'; ctx.fill()

      // Main button
      const spinGrad = ctx.createLinearGradient(0, SPIN_R.y, 0, SPIN_R.y + SPIN_R.h)
      if (spinning) {
        spinGrad.addColorStop(0, '#374151'); spinGrad.addColorStop(1, '#1f2937')
      } else if (isAutoOn) {
        spinGrad.addColorStop(0, '#92400e'); spinGrad.addColorStop(1, '#713f12')
      } else {
        spinGrad.addColorStop(0, '#d97706'); spinGrad.addColorStop(1, '#92400e')
      }
      rr(ctx, SPIN_R.x, SPIN_R.y, SPIN_R.w, SPIN_R.h, 10)
      ctx.fillStyle = spinGrad; ctx.fill()
      if (!spinning) {
        ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10
      }
      ctx.strokeStyle = spinning ? '#4b5563' : '#fbbf24'; ctx.lineWidth = 1.5
      rr(ctx, SPIN_R.x, SPIN_R.y, SPIN_R.w, SPIN_R.h, 10); ctx.stroke()
      ctx.shadowBlur = 0

      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillStyle = spinning ? '#9ca3af' : '#fff'
      ctx.font = 'bold 16px system-ui'
      ctx.fillText(spinLabel, SPIN_R.x + SPIN_R.w/2, SPIN_R.y + SPIN_R.h/2)

      // ── Bottom row: quick + auto ───────────────────────────────────────
      drawBtn(ctx, QUICK_R, `⚡  QUICK${quickSpin ? '  ●' : ''}`,
        quickSpin ? '#14532d' : '#1f2937',
        quickSpin ? '#4ade80' : '#6b7280',
        quickSpin ? '#16a34a' : '#374151',
        8, 12)

      if (autoSpinsLeft > 0) {
        drawBtn(ctx, STOP_R, 'PARAR AUTO', '#1f2937', '#f87171', '#7f1d1d', 8, 13)
      } else {
        ctx.textAlign = 'right'; ctx.font = '10px system-ui'; ctx.fillStyle = '#374151'
        ctx.fillText('AUTO', AB_X0 - 10, AUTO_Y + 20)
        for (const r of AUTO_RS)
          drawBtn(ctx, r, `×${r.v}`, '#1f2937', '#6b7280', '#374151', 8, 13, spinning)
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])  // mount once — all live state read via refs

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100dvh', background: '#030712', padding: '8px',
    }}>
      <canvas ref={canvasRef} style={{ borderRadius: 16, display: 'block', maxWidth: '100%' }} />
    </div>
  )
}
