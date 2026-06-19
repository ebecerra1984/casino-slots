const BET_OPTIONS   = [1, 3, 5, 10, 25]
const AUTO_PRESETS  = [10, 25, 50, 100]

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
  const canSpin = !spinning && (balance >= bet || freeSpinsLeft > 0)

  return (
    <div className="flex flex-col items-center gap-3 w-full mt-4">

      {/* Balance / Free Spins / Bet */}
      <div className="flex items-center gap-6 text-sm">
        <div className="text-center">
          <p className="text-gray-500 uppercase tracking-widest text-xs">Balance</p>
          <p className="text-white font-bold text-lg">{balance.toFixed(2)}</p>
        </div>
        {freeSpinsLeft > 0 && (
          <div className="text-center">
            <p className="text-amber-400 uppercase tracking-widest text-xs">Free Spins</p>
            <p className="text-amber-300 font-bold text-lg">{freeSpinsLeft}</p>
          </div>
        )}
        <div className="text-center">
          <p className="text-gray-500 uppercase tracking-widest text-xs">Apuesta / línea</p>
          <p className="text-white font-bold text-lg">{bet.toFixed(2)}</p>
        </div>
      </div>

      {/* Bet selector + Quick spin toggle */}
      <div className="flex items-center gap-2">
        {BET_OPTIONS.map(b => (
          <button
            key={b}
            onClick={() => onBetChange(b)}
            disabled={spinning || isAutoSpinning}
            className={[
              'px-3 py-1 rounded text-sm font-semibold transition-all',
              bet === b
                ? 'bg-yellow-500 text-gray-900'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white',
              spinning || isAutoSpinning ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            {b}
          </button>
        ))}

        {/* Quick spin toggle */}
        <button
          onClick={onToggleQuickSpin}
          title="Tirada rápida"
          className={[
            'ml-1 px-3 py-1 rounded text-sm font-bold transition-all',
            quickSpin
              ? 'bg-cyan-500 text-gray-900 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white',
          ].join(' ')}
        >
          ⚡
        </button>
      </div>

      {/* Spin button */}
      <button
        onClick={onSpin}
        disabled={!canSpin || isAutoSpinning}
        className={[
          'relative px-14 py-4 rounded-full text-xl font-black uppercase tracking-widest',
          'transition-all duration-150 active:scale-95',
          canSpin && !isAutoSpinning
            ? 'bg-gradient-to-b from-yellow-400 to-yellow-600 text-gray-900 shadow-[0_0_20px_rgba(234,179,8,0.5)] hover:shadow-[0_0_30px_rgba(234,179,8,0.7)]'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed',
        ].join(' ')}
      >
        {spinning ? (
          <span className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Girando…
          </span>
        ) : freeSpinsLeft > 0 ? 'Tirada gratis' : 'Girar'}
      </button>

      {/* Auto-spin controls */}
      {isAutoSpinning ? (
        /* En curso: contador + Stop */
        <div className="flex items-center gap-3">
          <button
            onClick={onStopAutoSpin}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all"
          >
            ✕ Detener
          </button>
          <span className="text-gray-400 text-sm">
            Auto · <span className="text-white font-bold">{autoSpinsLeft}</span> restantes
          </span>
        </div>
      ) : (
        /* Reposo: botones de cantidad */
        <div className="flex items-center gap-1">
          <span className="text-gray-600 text-xs mr-1 uppercase tracking-widest">Auto</span>
          {AUTO_PRESETS.map(n => (
            <button
              key={n}
              onClick={() => onStartAutoSpin(n)}
              disabled={spinning || !canSpin}
              className={[
                'px-3 py-1 rounded text-sm font-semibold transition-all',
                'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white',
                spinning || !canSpin ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
