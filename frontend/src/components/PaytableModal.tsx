import type { SymbolId } from '../types'

const SYMBOLS: { id: SymbolId; emoji: string; label: string; pays: [number, number, number] }[] = [
  { id: '7',      emoji: '7️⃣',  label: 'Seven',  pays: [130, 486, 2430] },
  { id: 'BAR',    emoji: '🎰',  label: 'Bar',    pays: [53,  209, 1009] },
  { id: 'BELL',   emoji: '🔔',  label: 'Bell',   pays: [38,  149,  738] },
  { id: 'CHERRY', emoji: '🍒',  label: 'Cherry', pays: [28,   92,  450] },
  { id: 'LEMON',  emoji: '🍋',  label: 'Lemon',  pays: [10,   36,  175] },
  { id: 'ORANGE', emoji: '🍊',  label: 'Orange', pays: [10,   36,  175] },
  { id: 'GRAPE',  emoji: '🍇',  label: 'Grape',  pays: [10,   36,  175] },
]

const LINE_COLORS: Record<number, string> = {
  1: '#facc15',
  2: '#34d399',
  3: '#f472b6',
  4: '#60a5fa',
  5: '#fb923c',
}

const PAYLINES: { id: number; label: string; rows: number[] }[] = [
  { id: 1, label: 'Central',    rows: [1, 1, 1, 1, 1] },
  { id: 2, label: 'Superior',   rows: [0, 0, 0, 0, 0] },
  { id: 3, label: 'Inferior',   rows: [2, 2, 2, 2, 2] },
  { id: 4, label: 'Zigzag ↓',   rows: [0, 1, 2, 1, 0] },
  { id: 5, label: 'Zigzag ↑',   rows: [2, 1, 0, 1, 2] },
]

interface Props {
  onClose: () => void
}

export function PaytableModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700 overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-yellow-400 font-black tracking-widest uppercase text-sm">
            Tabla de pagos
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">

          {/* Paytable */}
          <section>
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">
              Premios · multiplicador sobre apuesta por línea
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase">
                  <th className="text-left py-1 font-normal">Símbolo</th>
                  <th className="text-center py-1 font-normal">3×</th>
                  <th className="text-center py-1 font-normal">4×</th>
                  <th className="text-center py-1 font-normal">5×</th>
                </tr>
              </thead>
              <tbody>
                {SYMBOLS.map(({ emoji, label, pays }) => (
                  <tr key={label} className="border-t border-gray-800">
                    <td className="py-2 flex items-center gap-2">
                      <span className="text-2xl">{emoji}</span>
                      <span className="text-gray-300">{label}</span>
                    </td>
                    {pays.map((v, i) => (
                      <td key={i} className="text-center py-2 font-bold text-white">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Scatter */}
          <section className="rounded-xl bg-gray-800/60 border border-amber-500/20 p-4">
            <p className="text-amber-400 font-bold text-sm mb-3 flex items-center gap-2">
              ⭐ Scatter — aparece en cualquier posición
            </p>
            <div className="flex flex-col gap-1 text-sm">
              {[
                { n: 3, prize: 3,  spins: 10 },
                { n: 4, prize: 10, spins: 15 },
                { n: 5, prize: 50, spins: 20 },
              ].map(({ n, prize, spins }) => (
                <div key={n} className="flex justify-between text-gray-300">
                  <span>{'⭐'.repeat(n)}</span>
                  <span>
                    <span className="text-white font-semibold">{prize}×</span> apuesta total
                    {' + '}
                    <span className="text-amber-400 font-semibold">{spins}</span> tiradas gratis
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Paylines */}
          <section>
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">
              5 Líneas de pago
            </p>
            <div className="flex flex-col gap-2">
              {PAYLINES.map(({ id, label, rows }) => {
                const color = LINE_COLORS[id]
                return (
                  <div key={id} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-4 text-right" style={{ color }}>{id}</span>
                    {/* Mini grilla con la línea */}
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }, (_, col) => (
                        <div key={col} className="flex flex-col gap-0.5">
                          {[0, 1, 2].map(row => (
                            <div
                              key={row}
                              className="w-5 h-3 rounded-sm"
                              style={{
                                backgroundColor: rows[col] === row
                                  ? color + 'cc'
                                  : '#374151',
                              }}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                    <span className="text-gray-400 text-xs">{label}</span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Nota RTP */}
          <p className="text-gray-600 text-xs text-center">
            RTP teórico: ~93% · Premios = multiplicador × apuesta/línea · Costo = apuesta × 5 líneas
          </p>
        </div>
      </div>
    </div>
  )
}
