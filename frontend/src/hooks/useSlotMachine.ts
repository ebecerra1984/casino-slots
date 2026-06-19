import { useState, useCallback, useRef } from 'react'
import type { SpinResponse, SymbolId } from '../types'

const INITIAL_BALANCE = 1000

const REEL_BASE_MS  = 1400
const REEL_STEP_MS  = 300
const REEL_BASE_QUICK = 450
const REEL_STEP_QUICK = 80
const COLS = 5

const IDLE_MATRIX: SymbolId[][] = [
  ['CHERRY', 'LEMON', 'ORANGE', 'GRAPE', 'BELL'],
  ['LEMON',  'ORANGE', 'GRAPE', 'BELL', 'CHERRY'],
  ['ORANGE', 'GRAPE', 'BELL', 'CHERRY', 'LEMON'],
]

export interface GameState {
  balance: number
  bet: number
  lines: number
  matrix: SymbolId[][]
  lastResult: SpinResponse | null
  spinning: boolean
  stoppedCols: number
  freeSpinsLeft: number
  autoSpinsLeft: number
  quickSpin: boolean
  error: string | null
}

export function useSlotMachine() {
  const [state, setState] = useState<GameState>({
    balance: INITIAL_BALANCE,
    bet: 3,
    lines: 5,
    matrix: IDLE_MATRIX,
    lastResult: null,
    spinning: false,
    stoppedCols: COLS,
    freeSpinsLeft: 0,
    autoSpinsLeft: 0,
    quickSpin: false,
    error: null,
  })

  const pendingResult  = useRef<SpinResponse | null>(null)
  const timers         = useRef<ReturnType<typeof setTimeout>[]>([])
  // Refs para evitar stale closures en los timers
  const autoSpinsRef   = useRef(0)
  const quickSpinRef   = useRef(false)
  const spinRef        = useRef<() => void>(() => {})

  const spin = useCallback(async () => {
    if (state.spinning) return

    const isFree = state.freeSpinsLeft > 0

    if (!isFree && state.balance < state.bet * state.lines) {
      // Sin saldo: cancelar auto-spin si estaba activo
      autoSpinsRef.current = 0
      setState(s => ({ ...s, autoSpinsLeft: 0 }))
      return
    }

    timers.current.forEach(clearTimeout)
    timers.current = []

    setState(s => ({
      ...s,
      spinning: true,
      stoppedCols: 0,
      lastResult: null,
      error: null,
      balance: isFree ? s.balance : s.balance - s.bet * s.lines,
      freeSpinsLeft: isFree ? s.freeSpinsLeft - 1 : s.freeSpinsLeft,
    }))

    const baseMs = quickSpinRef.current ? REEL_BASE_QUICK : REEL_BASE_MS
    const stepMs = quickSpinRef.current ? REEL_STEP_QUICK : REEL_STEP_MS

    try {
      const res = await fetch('/api/v1/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet: state.bet, lines: state.lines }),
      })
      if (!res.ok) throw new Error('Error en el servidor')
      const data: SpinResponse = await res.json()
      pendingResult.current = data

      for (let col = 0; col < COLS; col++) {
        const delay = baseMs + col * stepMs
        const t = setTimeout(() => {
          const isLast = col === COLS - 1
          const result = pendingResult.current
          if (!result) return

          if (isLast) pendingResult.current = null

          setState((s: GameState): GameState => {
            const newMatrix: SymbolId[][] = s.matrix.map((row, rowIdx) => {
              const newRow = [...row] as SymbolId[]
              newRow[col] = result.matrix[rowIdx][col]
              return newRow
            })

            const nextAutoLeft = isLast ? autoSpinsRef.current : s.autoSpinsLeft

            return {
              ...s,
              stoppedCols: col + 1,
              matrix: newMatrix,
              spinning: isLast ? false : s.spinning,
              autoSpinsLeft: nextAutoLeft,
              ...(isLast ? {
                lastResult: result,
                balance: s.balance + result.total_prize,
                freeSpinsLeft: s.freeSpinsLeft + result.scatter_free_spins,
              } : {}),
            }
          })

          // Encadenar siguiente auto-spin tras la última parada
          if (isLast && autoSpinsRef.current > 0) {
            autoSpinsRef.current -= 1
            setState(s => ({ ...s, autoSpinsLeft: autoSpinsRef.current }))
            if (autoSpinsRef.current > 0) {
              const gap = quickSpinRef.current ? 200 : 700
              setTimeout(() => spinRef.current(), gap)
            }
          }
        }, delay)
        timers.current.push(t)
      }
    } catch (e) {
      timers.current.forEach(clearTimeout)
      autoSpinsRef.current = 0
      setState(s => ({
        ...s,
        spinning: false,
        stoppedCols: COLS,
        autoSpinsLeft: 0,
        balance: isFree ? s.balance : s.balance + s.bet * s.lines,
        error: e instanceof Error ? e.message : 'Error desconocido',
      }))
    }
  }, [state.spinning, state.balance, state.bet, state.lines, state.freeSpinsLeft])

  // Mantener el ref siempre actualizado
  spinRef.current = spin

  const setBet = useCallback((bet: number) => {
    setState(s => ({ ...s, bet, lastResult: null }))
  }, [])

  const startAutoSpin = useCallback((count: number) => {
    autoSpinsRef.current = count
    setState(s => ({ ...s, autoSpinsLeft: count }))
    spinRef.current()
  }, [])

  const stopAutoSpin = useCallback(() => {
    autoSpinsRef.current = 0
    setState(s => ({ ...s, autoSpinsLeft: 0 }))
  }, [])

  const toggleQuickSpin = useCallback(() => {
    quickSpinRef.current = !quickSpinRef.current
    setState(s => ({ ...s, quickSpin: !s.quickSpin }))
  }, [])

  return { state, spin, setBet, startAutoSpin, stopAutoSpin, toggleQuickSpin }
}
