import type { SpinResponse } from '../types'

interface Props {
  result: SpinResponse | null
}

export function WinDisplay({ result }: Props) {
  if (!result || !result.is_win) return null

  const isJackpot = result.total_prize >= result.bet * 100
  const isBig     = result.total_prize >= result.bet * 20

  return (
    <div className="win-banner flex flex-col items-center gap-1 py-3">
      {result.scatter_free_spins > 0 && (
        <p className="text-amber-300 text-sm font-bold tracking-widest uppercase">
          ⭐ {result.scatter_free_spins} tiradas gratis
        </p>
      )}

      <p className={[
        'font-black tracking-tight',
        isJackpot ? 'text-5xl text-yellow-300' :
        isBig     ? 'text-4xl text-yellow-400' :
                    'text-3xl text-white',
      ].join(' ')}>
        {isJackpot ? '🏆 JACKPOT ' : isBig ? '🎉 BIG WIN ' : '✨ '}
        +{result.total_prize.toFixed(2)}
      </p>

      {result.line_results.map(lr => (
        <p key={lr.line_id} className="text-gray-400 text-xs">
          Línea {lr.line_id} · {lr.match_count}× {lr.matched_symbol} · ×{lr.multiplier}
        </p>
      ))}
    </div>
  )
}
