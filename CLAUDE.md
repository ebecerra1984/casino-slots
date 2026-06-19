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
└── frontend/         React 18 + Vite + Tailwind CSS v4 · lucide-react
    └── src/
        ├── components/   SlotMachine, Reel, Controls, PaylineOverlay, PaytableModal…
        ├── hooks/        useSlotMachine.ts, useAudio.ts
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
- `bet` = apuesta **por línea** (no total); las opciones [1,3,5,10,25] son per-line
- Costo por spin = `bet × lines` (actualmente 5 líneas fijas) → se descuenta del balance
- Premio por línea = `bet × multiplier`
- Premio scatter = `SCATTER_PAYS[n] × (bet × lines)`
- La UI muestra "Apuesta total" = `bet × 5` para que el jugador vea el costo real

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

### Audio (Web Audio API — sin archivos externos)
- Todo sintetizado programáticamente en `useAudio.ts`
- `AudioContext` se inicializa diferido al primer gesto del usuario (política de autoplay)
- Sonido de rodillos: buffer de 1 tick (impulso+decay × exp(-200t), 66ms) en loop
  - `playbackRate=1.0` normal, `1.8` quick-spin
- `playReelStop()`: dos capas — cuerpo grave (lowpass 220Hz) + snap agudo (bandpass 1200Hz)
- Música de fondo: 16 notas C/F major, scheduler con `setTimeout` de 30ms
- `masterRef` (GainNode) controla mute global — no desconectar, solo `gain.value=0`

### Diseño responsive (mobile-first)
- Breakpoints Tailwind: base=mobile, `sm:`=640px, `md:`=768px
- Reel: `w-14 h-[168px]` → `sm:w-16 sm:h-48` → `md:w-20 md:h-56`
- Container: `rounded-none sm:rounded-2xl`, sin borde lateral en mobile, `min-h-svh sm:min-h-0`
- PaylineIndicator: `hidden sm:block`; en mobile se usa fila compacta de números bajo los reels
- WinDisplay: sin altura fija, renderiza condicionalmente (no reserva espacio cuando no hay ganancia)
- `#root`: `align-items: flex-start` en mobile, `center` en `sm:`

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
- Build de producción + dockerización para despliegue del cliente
