import type { SymbolId } from '../types'

const SYMBOL_CONFIG: Record<SymbolId, { emoji: string; label: string }> = {
  '7':      { emoji: '7️⃣',  label: 'Seven'   },
  'BAR':    { emoji: '🎰',  label: 'Bar'     },
  'BELL':   { emoji: '🔔',  label: 'Bell'    },
  'CHERRY': { emoji: '🍒',  label: 'Cherry'  },
  'LEMON':  { emoji: '🍋',  label: 'Lemon'   },
  'ORANGE': { emoji: '🍊',  label: 'Orange'  },
  'GRAPE':  { emoji: '🍇',  label: 'Grape'   },
  'SCATTER':{ emoji: '⭐',  label: 'Scatter' },
}

interface Props {
  symbol: SymbolId
  isWin?: boolean
  isScatter?: boolean
}

export function SymbolCell({ symbol, isWin, isScatter }: Props) {
  const cfg = SYMBOL_CONFIG[symbol]

  return (
    <div
      className={[
        'flex items-center justify-center w-full h-full select-none',
        'text-3xl sm:text-4xl transition-all duration-150',
        isWin     ? 'symbol-win scale-110' : '',
        isScatter ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]' : '',
      ].join(' ')}
      title={cfg.label}
    >
      {cfg.emoji}
    </div>
  )
}
