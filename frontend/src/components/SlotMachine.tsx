import { useMemo, useState, useEffect, useRef, useCallback } from "react"
import { Volume2, VolumeX, Info } from "lucide-react"
import { useSlotMachine } from "../hooks/useSlotMachine"
import { useAudio } from "../hooks/useAudio"
import { Reel } from "./Reel"
import { PaylineIndicator } from "./PaylineIndicator"
import { PaylineOverlay } from "./PaylineOverlay"
import { Controls } from "./Controls"
import { WinDisplay } from "./WinDisplay"
import { PaytableModal } from "./PaytableModal"
import type { SessionData, SymbolId } from "../types"

const PAYLINE_ROWS: Record<number, number[]> = {
  1: [1, 1, 1, 1, 1],
  2: [0, 0, 0, 0, 0],
  3: [2, 2, 2, 2, 2],
  4: [0, 1, 2, 1, 0],
  5: [2, 1, 0, 1, 2]
}

const COLS = 5

interface Props {
  session: SessionData | null
}

export function SlotMachine({ session }: Props) {
  const { state, spin, setBet, startAutoSpin, stopAutoSpin, toggleQuickSpin } =
    useSlotMachine({
      initialBalance: session?.balance,
      sessionToken: session?.session_token
    })
  const {
    matrix,
    spinning,
    stoppedCols,
    lastResult,
    bet,
    balance,
    lines,
    freeSpinsLeft,
    autoSpinsLeft,
    quickSpin,
    error
  } = state
  const [showInfo, setShowInfo] = useState(false)

  const audio = useAudio()

  // ── audio: spin start / stop ──
  const prevSpinRef = useRef(false)
  useEffect(() => {
    const wasSpinning = prevSpinRef.current
    prevSpinRef.current = spinning

    if (spinning && !wasSpinning) {
      audio.playSpin(quickSpin)
    } else if (!spinning && wasSpinning) {
      audio.stopSpin()
      if (lastResult) {
        const totalBet = bet * lines
        const ratio = totalBet > 0 ? lastResult.total_prize / totalBet : 0
        if (lastResult.scatter_count >= 3) {
          audio.playScatter()
          if (lastResult.is_win) setTimeout(() => audio.playWin(ratio), 700)
        } else if (lastResult.is_win) {
          audio.playWin(ratio)
        }
      }
    }
  }, [spinning])

  // ── audio: click por cada rodillo que para ──
  const prevStoppedRef = useRef(COLS)
  useEffect(() => {
    if (stoppedCols > prevStoppedRef.current && stoppedCols <= COLS) {
      audio.playReelStop()
    }
    prevStoppedRef.current = stoppedCols
  }, [stoppedCols])

  // ── wrappers que inicializan audio en primer gesto ──
  const handleSpin = useCallback(() => {
    audio.initAudio()
    spin()
  }, [spin, audio.initAudio])

  const handleStartAutoSpin = useCallback(
    (n: number) => {
      audio.initAudio()
      startAutoSpin(n)
    },
    [startAutoSpin, audio.initAudio]
  )

  // ── cálculo de celdas ganadoras ──
  const { winRowsByCol, scatterRowsByCol, winLineIds } = useMemo(() => {
    const winRowsByCol: Set<number>[] = Array.from(
      { length: 5 },
      () => new Set<number>()
    )
    const scatterRowsByCol: Set<number>[] = Array.from(
      { length: 5 },
      () => new Set<number>()
    )
    const winLineIds = new Set<number>()

    if (!lastResult || !matrix)
      return { winRowsByCol, scatterRowsByCol, winLineIds }

    for (const lr of lastResult.line_results) {
      winLineIds.add(lr.line_id)
      const rows = PAYLINE_ROWS[lr.line_id]
      for (let col = 0; col < lr.match_count; col++)
        winRowsByCol[col].add(rows[col])
    }

    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 5; col++)
        if (matrix[row][col] === "SCATTER") scatterRowsByCol[col].add(row)

    return { winRowsByCol, scatterRowsByCol, winLineIds }
  }, [lastResult, matrix])

  const displayMatrix: SymbolId[][] = matrix ?? [
    ["CHERRY", "LEMON", "ORANGE", "GRAPE", "BELL"],
    ["LEMON", "ORANGE", "GRAPE", "BELL", "CHERRY"],
    ["ORANGE", "GRAPE", "BELL", "CHERRY", "LEMON"]
  ]

  return (
    <>
      <div
        className={[
          "flex flex-col items-center gap-1",
          "w-full sm:max-w-xl",
          "p-3 sm:p-4",
          "rounded-none sm:rounded-2xl",
          "bg-gray-950",
          "border-0 sm:border sm:border-gray-800",
          "shadow-none sm:shadow-2xl",
          "min-h-svh sm:min-h-0"
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <button
            onClick={audio.toggleMute}
            title={audio.muted ? "Activar sonido" : "Silenciar"}
            className="w-8 h-8 rounded-full border border-gray-700 text-gray-400 hover:border-yellow-500 hover:text-yellow-400 transition-colors flex items-center justify-center"
          >
            {audio.muted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <h1 className="text-xl font-black tracking-widest uppercase text-yellow-400">
            🎰 Slots
          </h1>

          <button
            onClick={() => setShowInfo(true)}
            className="w-8 h-8 rounded-full border border-gray-700 text-gray-400 hover:border-yellow-500 hover:text-yellow-400 transition-colors flex items-center justify-center"
            title="Tabla de pagos"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Grilla de rodillos */}
        <div className="flex items-center gap-1 sm:gap-3 w-full justify-center">
          {/* Indicador de líneas — oculto en mobile, visible en sm+ */}
          <div className="hidden sm:block">
            <PaylineIndicator activeLines={lines} winLineIds={winLineIds} />
          </div>

          <div className="relative flex gap-1 sm:gap-2">
            {Array.from({ length: COLS }, (_, col) => (
              <Reel
                key={col}
                symbols={[
                  displayMatrix[0][col],
                  displayMatrix[1][col],
                  displayMatrix[2][col]
                ]}
                isSpinning={spinning && col >= stoppedCols}
                quickSpin={quickSpin}
                winRows={winRowsByCol[col]}
                scatterRows={scatterRowsByCol[col]}
              />
            ))}
            <PaylineOverlay
              lineResults={lastResult?.line_results ?? []}
              spinning={spinning || stoppedCols < COLS}
            />
          </div>

          {/* Spacer de balance — solo en sm+ */}
          <div className="hidden sm:block w-8" />
        </div>

        {/* Indicador de líneas compacto — solo mobile */}
        <div className="flex sm:hidden items-center justify-center gap-4 w-full py-0.5">
          {[1, 2, 3, 4, 5].map((id) => {
            const colors: Record<number, string> = {
              1: "#facc15",
              2: "#34d399",
              3: "#f472b6",
              4: "#60a5fa",
              5: "#fb923c"
            }
            const won = winLineIds.has(id)
            return (
              <span
                key={id}
                style={{ color: colors[id] }}
                className={[
                  "text-[11px] font-black",
                  won ? "animate-pulse" : "opacity-40"
                ].join(" ")}
              >
                {id}
              </span>
            )
          })}
        </div>

        {/* Resultado — sin altura fija para que colapse cuando no hay nada */}
        {(error || lastResult?.is_win) && (
          <div className="flex items-center justify-center w-full">
            {error ? (
              <p className="text-red-400 text-sm py-1">{error}</p>
            ) : (
              <WinDisplay result={lastResult} />
            )}
          </div>
        )}

        {/* Controles */}
        <Controls
          bet={bet}
          balance={balance}
          spinning={spinning}
          freeSpinsLeft={freeSpinsLeft}
          autoSpinsLeft={autoSpinsLeft}
          quickSpin={quickSpin}
          onBetChange={setBet}
          onSpin={handleSpin}
          onStartAutoSpin={handleStartAutoSpin}
          onStopAutoSpin={stopAutoSpin}
          onToggleQuickSpin={toggleQuickSpin}
        />
      </div>

      {showInfo && <PaytableModal onClose={() => setShowInfo(false)} />}
    </>
  )
}
