# Casino Slots — contexto para Claude Code

## Qué es este proyecto
Motor matemático + interfaz React para una tragamonedas virtual embebible como iframe.
El casino cliente embebe `frontend/dist/index.html` en su sitio; la API es interna.

## Arquitectura

```
casino-slots/
├── backend/          Python 3.13 · FastAPI · numpy · pandas
│   ├── engine/       Lógica matemática pura (reels, evaluator, paylines, symbols)
│   ├── api/          Routes + Pydantic models
│   ├── main.py       Entry point FastAPI + CORS
│   ├── simulate_rtp.py  Script de calibración RTP (CLI)
│   └── requirements.txt
└── frontend/         React 18 + Vite + Tailwind CSS v4
    └── src/
        ├── components/   SlotMachine, Reel, Controls, PaylineOverlay, PaytableModal…
        ├── hooks/        useSlotMachine.ts — toda la lógica de estado
        └── types.ts
```

## Cómo arrancar en desarrollo

```bash
# Backend (puerto 8000)
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (puerto 5173, proxy /api → :8000)
cd frontend
yarn install
yarn dev
```

## Decisiones técnicas importantes

### Modelo de apuesta
- `bet` = apuesta **por línea** (no total)
- Costo por spin = `bet × lines` (actualmente 5 líneas fijas)
- Premio por línea = `bet × multiplier`
- Premio scatter = `SCATTER_PAYS[n] × (bet × lines)`

### Grilla y paylines
- 5 rodillos × 3 filas
- 5 paylines: 3 horizontales (top/mid/bot) + 2 zigzag (V↓ y V↑)
- Match izquierda→derecha consecutivo desde rodillo 0
- Sin WILD; SCATTER paga en cualquier posición (no necesita payline)

### SCATTER — regla crítica
- Máximo 1 SCATTER visible por rodillo (columna)
- Las tiras usan `_spaced()` en `reels.py`: 2 SCATTERs separados ≥ `len/2` posiciones
- `spin_reels()` rechaza con `while True` cualquier parada que muestre 2+ SCATTERs en un rodillo

### Numpy dtype
- `np.array(strip, dtype=object)` — obligatorio para preservar identidad de Enum
- Comparaciones con `is Symbol.X` (no `==`) para evitar falsos negativos

### RTP calibrado
- ~93% teórico (simulado con 5M tiradas)
- Comando: `cd backend && python3 simulate_rtp.py 3000000`
- El simulador usa `total_bet += BET * LINES` (no solo `BET`)

### React / animación de rodillos
- `stoppedCols: number` — cuántos rodillos pararon (0=todos girando, 5=todos parados)
- `isSpinning = spinning && col >= stoppedCols` → cada rodillo para secuencialmente izq→der
- Animación CSS `reel-spin`: `translateY(-70%) → translateY(0)` (arriba hacia abajo)
- Quick spin: `animationDuration` inline en el div del rodillo (0.18s vs 0.55s)
- Cuando un rodillo para, se revela su columna real inmediatamente (no al final)

### Auto-spin
- `autoSpinsRef` (ref) = source of truth para evitar stale closures en setTimeout
- `spinRef.current = spin` siempre actualizado para llamadas desde timers
- `startAutoSpin(n)` → decrementa al terminar cada spin; se detiene sola a 0 o sin saldo

### Stale closure fix (React 18)
En los timers de `useSlotMachine.ts`, se captura `pendingResult.current` como variable
local ANTES de llamar `setState`, porque el updater corre en microtask posterior.

## Variables clave a no cambiar sin recalibrar RTP

| Archivo | Constante | Valor actual | Efecto si se cambia |
|---|---|---|---|
| `symbols.py` | `PAYTABLE` | ver archivo | RTP ±% directo |
| `symbols.py` | `SCATTER_PAYS` | {3:3, 4:10, 5:50} | RTP ±% |
| `reels.py` | conteos de símbolos | ver `_r*_base` | RTP ±% significativo |
| `paylines.py` | `PAYLINES` | 5 líneas | agregar = recalibrar |
| `useSlotMachine.ts` | `REEL_BASE_MS` | 1400ms | solo UX |

## Package manager
Frontend: **yarn** (no npm). Siempre `yarn add`, `yarn dev`, `yarn build`.

## Pendientes / ideas anotadas
- Música de fondo + efectos de sonido (spin, win, scatter, jackpot)
- Build de producción + dockerización para despliegue del cliente
