import type { SymbolId } from '../types'
import { SymbolCell } from './SymbolCell'

const SPIN_SYMBOLS: SymbolId[] = [
  'CHERRY', 'LEMON', 'ORANGE', 'GRAPE', 'BELL',
  'BAR', '7', 'CHERRY', 'LEMON', 'ORANGE',
]

interface Props {
  symbols: SymbolId[]
  isSpinning: boolean
  quickSpin: boolean
  winRows: Set<number>
  scatterRows: Set<number>
}

export function Reel({ symbols, isSpinning, quickSpin, winRows, scatterRows }: Props) {
  return (
    <div className="relative w-14 h-[168px] sm:w-16 sm:h-48 md:w-20 md:h-56 overflow-hidden rounded-lg bg-gray-900 border border-gray-700">
      {/* Gradiente top/bottom para efecto de profundidad */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(17,24,39,0.7) 0%, transparent 22%, transparent 78%, rgba(17,24,39,0.7) 100%)',
        }}
      />

      {isSpinning ? (
        <div
          className="reel-spinning flex flex-col"
          style={{ height: '333%', animationDuration: quickSpin ? '0.18s' : '0.55s' }}
        >
          {SPIN_SYMBOLS.map((s, i) => (
            <div
              key={i}
              className="flex-none flex items-center justify-center"
              style={{ height: `${100 / SPIN_SYMBOLS.length}%` }}
            >
              <SymbolCell symbol={s} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {symbols.map((sym, row) => (
            <div
              key={row}
              className={[
                'flex-1 flex items-center justify-center border-b border-gray-800 last:border-0',
                winRows.has(row) ? 'bg-yellow-500/10' : '',
              ].join(' ')}
            >
              <SymbolCell
                symbol={sym}
                isWin={winRows.has(row)}
                isScatter={scatterRows.has(row)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
