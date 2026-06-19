const LINE_COLORS: Record<number, string> = {
  1: '#facc15',
  2: '#34d399',
  3: '#f472b6',
  4: '#60a5fa',
  5: '#fb923c',
}

// Fila (0-2) por columna para cada payline
const PAYLINE_ROWS: Record<number, number[]> = {
  1: [1, 1, 1, 1, 1],
  2: [0, 0, 0, 0, 0],
  3: [2, 2, 2, 2, 2],
  4: [0, 1, 2, 1, 0],
  5: [2, 1, 0, 1, 2],
}

interface Props {
  activeLines: number
  winLineIds: Set<number>
}

export function PaylineIndicator({ activeLines, winLineIds }: Props) {
  return (
    <div className="flex flex-col justify-around h-[168px] sm:h-48 md:h-56 px-1 gap-1">
      {[1, 2, 3, 4, 5].map(lineId => {
        const color = LINE_COLORS[lineId]
        const active = lineId <= activeLines
        const won    = winLineIds.has(lineId)
        const rows   = PAYLINE_ROWS[lineId]

        // Mini SVG 5×3 mostrando la forma de la línea
        const pts = [0, 1, 2, 3, 4]
          .map(col => `${col * 4 + 2},${rows[col] * 4 + 2}`)
          .join(' ')

        return (
          <div
            key={lineId}
            className={[
              'flex items-center gap-1 transition-all duration-300',
              active ? 'opacity-100' : 'opacity-20',
            ].join(' ')}
          >
            <span
              className={['text-[10px] font-bold w-3 text-right leading-none', won ? 'animate-pulse' : ''].join(' ')}
              style={{ color }}
            >
              {lineId}
            </span>
            <svg
              width="22" height="14"
              viewBox="0 0 22 14"
              style={{ overflow: 'visible' }}
            >
              <polyline
                points={pts}
                fill="none"
                stroke={won ? color : color}
                strokeWidth={won ? '2' : '1.5'}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={won ? 1 : 0.7}
              />
              {[0, 1, 2, 3, 4].map(col => (
                <circle
                  key={col}
                  cx={col * 4 + 2}
                  cy={rows[col] * 4 + 2}
                  r="1.5"
                  fill={color}
                  opacity={won ? 1 : 0.7}
                />
              ))}
            </svg>
          </div>
        )
      })}
    </div>
  )
}
