import { useMemo, useState } from 'react'
import { useSlotMachine } from '../hooks/useSlotMachine'
import { Reel } from './Reel'
import { PaylineIndicator } from './PaylineIndicator'
import { PaylineOverlay } from './PaylineOverlay'
import { Controls } from './Controls'
import { WinDisplay } from './WinDisplay'
import { PaytableModal } from './PaytableModal'
import type { SymbolId } from '../types'

// Fila (0-2) que ocupa cada payline en cada columna
const PAYLINE_ROWS: Record<number, number[]> = {
  1: [1, 1, 1, 1, 1],
  2: [0, 0, 0, 0, 0],
  3: [2, 2, 2, 2, 2],
  4: [0, 1, 2, 1, 0],
  5: [2, 1, 0, 1, 2],
}

export function SlotMachine() {
  const { state, spin, setBet, startAutoSpin, stopAutoSpin, toggleQuickSpin } = useSlotMachine()
  const { matrix, spinning, stoppedCols, lastResult, bet, balance, lines,
          freeSpinsLeft, autoSpinsLeft, quickSpin, error } = state
  const [showInfo, setShowInfo] = useState(false)

  const { winRowsByCol, scatterRowsByCol, winLineIds } = useMemo(() => {
    const winRowsByCol: Set<number>[] = Array.from({ length: 5 }, () => new Set<number>())
    const scatterRowsByCol: Set<number>[] = Array.from({ length: 5 }, () => new Set<number>())
    const winLineIds = new Set<number>()

    if (!lastResult || !matrix) return { winRowsByCol, scatterRowsByCol, winLineIds }

    for (const lr of lastResult.line_results) {
      winLineIds.add(lr.line_id)
      const rows = PAYLINE_ROWS[lr.line_id]
      for (let col = 0; col < lr.match_count; col++) {
        winRowsByCol[col].add(rows[col])
      }
    }

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        if (matrix[row][col] === 'SCATTER') {
          scatterRowsByCol[col].add(row)
        }
      }
    }

    return { winRowsByCol, scatterRowsByCol, winLineIds }
  }, [lastResult, matrix])

  const displayMatrix: SymbolId[][] = matrix ?? [
    ['CHERRY', 'LEMON', 'ORANGE', 'GRAPE', 'BELL'],
    ['LEMON',  'ORANGE', 'GRAPE', 'BELL', 'CHERRY'],
    ['ORANGE', 'GRAPE', 'BELL', 'CHERRY', 'LEMON'],
  ]

  return (
    <>
      <div className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-gray-950 border border-gray-800 shadow-2xl w-full max-w-xl">

        {/* Header */}
        <div className="flex items-center justify-between w-full mb-2">
          <div className="w-8" />
          <h1 className="text-2xl font-black tracking-widest uppercase text-yellow-400">
            🎰 Slots
          </h1>
          <button
            onClick={() => setShowInfo(true)}
            className="w-8 h-8 rounded-full border border-gray-700 text-gray-400 hover:border-yellow-500 hover:text-yellow-400 transition-colors text-sm font-bold flex items-center justify-center"
            title="Tabla de pagos"
          >
            i
          </button>
        </div>

        {/* Grilla de rodillos */}
        <div className="flex items-center gap-3">
          <PaylineIndicator activeLines={lines} winLineIds={winLineIds} />

          <div className="relative flex gap-2">
            {Array.from({ length: 5 }, (_, col) => (
              <Reel
                key={col}
                symbols={[displayMatrix[0][col], displayMatrix[1][col], displayMatrix[2][col]]}
                isSpinning={spinning && col >= stoppedCols}
                quickSpin={quickSpin}
                winRows={winRowsByCol[col]}
                scatterRows={scatterRowsByCol[col]}
              />
            ))}
            <PaylineOverlay
              lineResults={lastResult?.line_results ?? []}
              spinning={spinning || stoppedCols < 5}
            />
          </div>

          <div className="w-8" />
        </div>

        {/* Resultado */}
        <div className="h-20 flex items-center justify-center">
          {error ? (
            <p className="text-red-400 text-sm">{error}</p>
          ) : (
            <WinDisplay result={lastResult} />
          )}
        </div>

        {/* Controles */}
        <Controls
          bet={bet}
          balance={balance}
          spinning={spinning}
          freeSpinsLeft={freeSpinsLeft}
          autoSpinsLeft={autoSpinsLeft}
          quickSpin={quickSpin}
          onBetChange={setBet}
          onSpin={spin}
          onStartAutoSpin={startAutoSpin}
          onStopAutoSpin={stopAutoSpin}
          onToggleQuickSpin={toggleQuickSpin}
        />
      </div>

      {showInfo && <PaytableModal onClose={() => setShowInfo(false)} />}
    </>
  )
}
