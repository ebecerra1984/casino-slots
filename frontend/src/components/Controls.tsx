import { RotateCcw, Square, Zap, RefreshCw, CircleDollarSign } from 'lucide-react'

const BET_OPTIONS  = [1, 3, 5, 10, 25]
const AUTO_PRESETS = [10, 25, 50, 100]

interface Props {
  bet: number
  balance: number
  spinning: boolean
  freeSpinsLeft: number
  autoSpinsLeft: number
  quickSpin: boolean
  onBetChange: (bet: number) => void
  onSpin: () => void
  onStartAutoSpin: (count: number) => void
  onStopAutoSpin: () => void
  onToggleQuickSpin: () => void
}

export function Controls({
  bet, balance, spinning, freeSpinsLeft,
  autoSpinsLeft, quickSpin,
  onBetChange, onSpin, onStartAutoSpin, onStopAutoSpin, onToggleQuickSpin,
}: Props) {
  const isAutoSpinning = autoSpinsLeft > 0
  const canSpin        = !spinning && (balance >= bet || freeSpinsLeft > 0)

  return (
    <div className="flex flex-col items-center gap-3 w-full pt-2">

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between w-full px-1">
        <div className="text-center">
          <p className="text-gray-500 uppercase tracking-widest text-[10px]">Balance</p>
          <p className="text-white font-bold text-base tabular-nums">{balance.toFixed(2)}</p>
        </div>

        {freeSpinsLeft > 0 && (
          <div className="text-center px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-amber-400 uppercase tracking-widest text-[10px]">Free Spins</p>
            <p className="text-amber-300 font-black text-base">{freeSpinsLeft}</p>
          </div>
        )}

        <div className="text-center">
          <p className="text-gray-500 uppercase tracking-widest text-[10px]">Apuesta</p>
          <p className="text-white font-bold text-base tabular-nums">{bet.toFixed(2)}</p>
        </div>
      </div>

      {/* ── Fichas de apuesta ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <CircleDollarSign className="w-4 h-4 text-gray-600 flex-shrink-0" />
        {BET_OPTIONS.map(b => (
          <button
            key={b}
            onClick={() => onBetChange(b)}
            disabled={spinning || isAutoSpinning}
            title={`Apostar ${b}`}
            className={[
              'w-9 h-9 rounded-full text-xs font-black border-2 transition-all duration-150',
              bet === b
                ? 'bg-yellow-500 border-yellow-300 text-gray-900 shadow-[0_0_10px_rgba(234,179,8,0.55)] scale-110'
                : 'bg-gray-800/80 border-gray-600 text-gray-400 hover:border-yellow-600/60 hover:text-yellow-400',
              spinning || isAutoSpinning ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95',
            ].join(' ')}
          >
            {b}
          </button>
        ))}
      </div>

      {/* ── Fila principal: [Auto] ─── [SPIN] ─── [Quick] ─────────────── */}
      <div className="flex items-center justify-center gap-5">

        {/* AUTO SPIN ─ izquierda */}
        <div className="flex flex-col items-center gap-1.5 w-20">
          {isAutoSpinning ? (
            <>
              <button
                onClick={onStopAutoSpin}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all active:scale-95 shadow-[0_0_14px_rgba(220,38,38,0.45)]"
                title="Detener auto-giro"
              >
                <Square className="w-6 h-6 text-white fill-white" />
              </button>
              <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider text-center">
                {autoSpinsLeft} restantes
              </span>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1">
                {AUTO_PRESETS.map(n => (
                  <button
                    key={n}
                    onClick={() => onStartAutoSpin(n)}
                    disabled={spinning || !canSpin}
                    title={`Auto-giro ×${n}`}
                    className={[
                      'w-9 h-7 rounded text-[11px] font-bold transition-all',
                      'bg-gray-800 border border-gray-700 text-gray-400',
                      'hover:border-indigo-500 hover:text-indigo-300',
                      spinning || !canSpin ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95',
                    ].join(' ')}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <span className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">
                Auto
              </span>
            </>
          )}
        </div>

        {/* SPIN ─ centro */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onSpin}
            disabled={!canSpin || isAutoSpinning}
            title={freeSpinsLeft > 0 ? 'Tirada gratis' : 'Girar'}
            className={[
              'w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1',
              'transition-all duration-150 active:scale-95 select-none',
              canSpin && !isAutoSpinning
                ? [
                    'bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700',
                    'shadow-[0_0_28px_rgba(234,179,8,0.55),inset_0_1px_0_rgba(255,255,255,0.3)]',
                    'hover:shadow-[0_0_40px_rgba(234,179,8,0.75)] text-gray-900',
                  ].join(' ')
                : 'bg-gray-700 text-gray-500 cursor-not-allowed shadow-none',
            ].join(' ')}
          >
            {spinning ? (
              <RefreshCw className="w-10 h-10 animate-spin" strokeWidth={2.5} />
            ) : (
              <>
                <RotateCcw className="w-9 h-9" strokeWidth={2.5} />
                {freeSpinsLeft > 0 && (
                  <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                    Gratis
                  </span>
                )}
              </>
            )}
          </button>
          {!spinning && !isAutoSpinning && (
            <span className="text-gray-600 text-[10px] uppercase tracking-[0.2em] font-semibold">
              Girar
            </span>
          )}
        </div>

        {/* QUICK SPIN ─ derecha */}
        <div className="flex flex-col items-center gap-1.5 w-20 items-end">
          <button
            onClick={onToggleQuickSpin}
            title={quickSpin ? 'Velocidad normal' : 'Giro rápido'}
            className={[
              'w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95',
              quickSpin
                ? 'bg-cyan-500 text-gray-900 shadow-[0_0_16px_rgba(6,182,212,0.6)] border-2 border-cyan-300'
                : 'bg-gray-800 border-2 border-gray-700 text-gray-400 hover:border-cyan-700 hover:text-cyan-400',
            ].join(' ')}
          >
            <Zap className={['w-6 h-6', quickSpin ? 'fill-gray-900' : ''].join(' ')} />
          </button>
          <span className={[
            'text-[10px] font-bold uppercase tracking-wider',
            quickSpin ? 'text-cyan-400' : 'text-gray-600',
          ].join(' ')}>
            {quickSpin ? 'Rápido' : 'Normal'}
          </span>
        </div>

      </div>
    </div>
  )
}
