# Casino Slots — contexto para Claude Code

## Qué es este proyecto
Motor matemático + interfaz React para una tragamonedas virtual embebible como iframe.
Sistema multi-tenant: cada casino es un cliente con su API key, ses sesiones, y webhook propio.

## Arquitectura

```
casino-slots/
├── backend/          Python 3.13 · FastAPI · SQLAlchemy · numpy
│   ├── engine/       Lógica matemática pura (reels, evaluator, paylines, symbols)
│   ├── api/
│   │   ├── routes.py     POST /spin · GET /config
│   │   ├── sessions.py   POST/GET /sessions · POST /sessions/{t}/close
│   │   └── models.py     SpinRequest / SpinResponse (Pydantic)
│   ├── services/
│   │   └── webhook.py    Fire-and-forget webhook via httpx
│   ├── database.py       SQLAlchemy engine + get_db dep
│   ├── db_models.py      ORM: Casino, GameSession, SpinRecord
│   ├── main.py           FastAPI app + lifespan (create_all)
│   ├── seed_casino.py    CLI para crear casinos
│   ├── simulate_rtp.py   Script de calibración RTP (CLI)
│   └── requirements.txt
└── frontend/         React 18 + Vite + Tailwind CSS v4 · lucide-react
    └── src/
        ├── components/   SlotMachine(session), SessionGate, Reel, Controls…
        ├── hooks/        useSlotMachine(opts), useSession, useAudio
        └── types.ts      SessionData, SpinResponse (con balance?)
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

### Trampas CSS críticas (Tailwind v4)

**1. No usar reglas `*` sin layer en `index.css`**
Las reglas sin `@layer` ganan sobre CUALQUIER regla con `@layer` (incluyendo
`@layer utilities`) sin importar la especificidad. Un `* { padding: 0 }` unlayered
zeroa silenciosamente toda utilidad de padding de Tailwind (`p-*`, `px-*`, `py-*`, etc.).
Tailwind ya provee este reset en `@layer base` — no duplicarlo fuera de capas.

**2. `className` multilinea en JSX puede fallar el scanner**
Un string JSX con saltos de línea literales (`className="foo\n  bar"`) puede hacer que
Tailwind v4 no detecte algunas clases. Siempre usar el patrón array:
```tsx
className={['clase-a', 'clase-b', 'sm:clase-c'].join(' ')}
```

### Testing visual con Playwright

```bash
# Setup (una sola vez)
mkdir -p /tmp/pw-test && cd /tmp/pw-test && npm init -y
npm install playwright@1.61.0 && npx playwright install chromium

# Script de screenshot — ver /tmp/pw-test/shot.mjs
# Requiere dev server en http://localhost:5173
cd /tmp/pw-test && node shot.mjs
# Output: /tmp/pw-shots/*.png
```
Para verificar padding: medir con `page.evaluate(() => getComputedStyle(el).paddingLeft)`.

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

### Multi-tenant — sesiones (Fase 1)

**Flujo de integración para un casino:**

```text
Casino backend → POST /api/v1/sessions
  Headers: X-API-Key: cs_live_XXXX
  Body: { player_id, balance, currency, game_id, expires_in_seconds }
  → { session_token, balance, currency, ... }

Casino → <iframe src="https://slots.example.com/?session=TOKEN">

Frontend → GET /api/v1/sessions/TOKEN (en mount, via useSession)
         → SpinRequest incluye session_token + is_free_spin
         → SpinResponse incluye balance autorizado por servidor

Casino backend → POST /api/v1/sessions/{token}/close  (al cierre)
  → { final_balance, status: "closed" }
```

**Crear un casino:**

```bash
cd backend && python3 seed_casino.py --name "MiCasino" --callback-url "https://mi.casino/webhook"
# → API Key: cs_live_XXXX  (guardar: no recuperable)
```

**Webhook por spin** (si callback_url está configurada):

```json
{ "event": "spin_completed", "session_token": "...", "player_id": "...",
  "spin": { "bet", "lines", "total_bet", "total_prize", "is_win" },
  "balance": { "before", "after", "currency" } }
```

**Modo desarrollo (sin token):**

- Si la URL no tiene `?session=TOKEN`, el frontend usa balance local (1000 créditos)
- El backend acepta spins sin session_token mientras `DEV_MODE=true` (default)
- El campo `balance` en `SpinResponse` es `null` en modo dev

**Tablas SQLite (dev) / PostgreSQL (prod):**

- `casinos`: id, name, api_key, callback_url, active
- `game_sessions`: token (PK), casino_id, player_id, balance, currency, status, expires_at
- `spin_records`: id, session_token, bet, lines, total_bet, total_prize, balance_before/after, is_win

### Motor matemático genérico — GameConfig (Fase 2)

El engine ya NO tiene paytable hardcodeada. Todo se lee de la tabla `games` (SQLite/PG).

**`engine/config.py`** — `GameConfig` (Pydantic):

- `reels: list[list[str]]` — 5 tiras de símbolos (strings, no enum)
- `paylines: dict[int, list[list[int]]]` — {line_id: [[row,col],...]}
- `paytable: dict[str, dict[int, int]]` — {símbolo: {n_matches: multiplicador}}
- `scatter_symbol`, `scatter_pays`, `scatter_free_spins`, `scatter_max_per_reel`

**Juegos seedeados** (`seed_game.py --force` para actualizar):

| ID              | Nombre                   | RTP    | Hit rate | Varianza |
| --------------- | ------------------------ | ------ | -------- | -------- |
| `slots-classic` | Slots Clásico            | ~92%   | 8.1%     | std=122  |
| `slots-high-vol`| Slots Alta Volatilidad   | ~94.7% | 8.1%     | std=134  |

`slots-high-vol` usa las mismas tiras que classic pero premiums ×4/×5 más altos.

**Rutas nuevas:**

- `GET /api/v1/games` — lista juegos (público)
- `GET /api/v1/games/{id}/config` — config completa (público)
- `POST /api/v1/games` — crear juego (requiere X-API-Key)
- `PUT /api/v1/games/{id}` — actualizar juego; invalida cache en memoria

**Cache de configs:** `_config_cache` en `api/routes.py` (dict en memoria, se limpia al reiniciar).

**simulate_rtp.py** acepta ahora `game_id` como primer argumento:

```bash
python3 simulate_rtp.py slots-classic 1000000
python3 simulate_rtp.py slots-high-vol 500000
```

**Arranque completo desde cero:**

```bash
cd backend
python3 seed_game.py        # crea juegos + Casino Demo
python3 seed_casino.py --name "OtroCasino"  # casinos adicionales
uvicorn main:app --reload
```

## Pendientes / ideas anotadas

- Build de producción + dockerización para despliegue del cliente
- Frontend: modal de paytable debería consumir `GET /api/v1/games/{game_id}/config` en vez de datos hardcodeados
