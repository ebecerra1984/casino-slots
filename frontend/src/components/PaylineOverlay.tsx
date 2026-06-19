import type { LineResult } from '../types'

// Coordenadas SVG (viewBox 0 0 100 100, preserveAspectRatio none)
// Columnas: x = 10, 30, 50, 70, 90  (centro de cada rodillo)
// Filas:    y = 16.67 (top) | 50 (mid) | 83.33 (bot)
const COL_X = [10, 30, 50, 70, 90]
const ROW_Y = [16.67, 50, 83.33]

// Fila (0-2) por columna para cada payline
const PAYLINE_ROWS: Record<number, number[]> = {
  1: [1, 1, 1, 1, 1],  // central
  2: [0, 0, 0, 0, 0],  // superior
  3: [2, 2, 2, 2, 2],  // inferior
  4: [0, 1, 2, 1, 0],  // V hacia abajo
  5: [2, 1, 0, 1, 2],  // V hacia arriba
}

const LINE_COLOR: Record<number, string> = {
  1: '#facc15',   // amarillo
  2: '#34d399',   // verde
  3: '#f472b6',   // rosa
  4: '#60a5fa',   // azul
  5: '#fb923c',   // naranja
}

interface Props {
  lineResults: LineResult[]
  spinning: boolean
}

export function PaylineOverlay({ lineResults, spinning }: Props) {
  if (spinning || lineResults.length === 0) return null

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-20"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {lineResults.map(lr => {
        const color = LINE_COLOR[lr.line_id]
        const rows  = PAYLINE_ROWS[lr.line_id]
        // Puntos hasta la última columna ganadora
        const points = Array.from({ length: lr.match_count }, (_, i) => ({
          x: COL_X[i],
          y: ROW_Y[rows[i]],
        }))
        const polyline = points.map(p => `${p.x},${p.y}`).join(' ')

        return (
          <g key={lr.line_id}>
            {/* Halo */}
            <polyline
              points={polyline}
              fill="none"
              stroke={color}
              strokeWidth="7"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity="0.18"
            />
            {/* Línea principal */}
            <polyline
              points={polyline}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity="0.92"
            />
            {/* Punto en cada rodillo ganador */}
            {points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} opacity="0.95" />
            ))}
          </g>
        )
      })}
    </svg>
  )
}
