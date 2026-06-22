import type { ReactNode } from 'react'
import { useSession } from '../hooks/useSession'
import type { SessionData } from '../types'

interface Props {
  children: (session: SessionData | null) => ReactNode
}

export function SessionGate({ children }: Props) {
  const state = useSession()

  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-svh bg-gray-950">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-gray-700 border-t-yellow-400 rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-widest">Cargando sesión…</span>
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-svh bg-gray-950">
        <div className="flex flex-col items-center gap-4 p-8 max-w-sm text-center">
          <span className="text-5xl">⚠️</span>
          <h1 className="text-white font-bold text-lg">Sesión inválida</h1>
          <p className="text-gray-400 text-sm">{state.message}</p>
        </div>
      </div>
    )
  }

  // status: 'ready' (sesión válida) o 'dev' (sin token → modo desarrollo)
  return <>{children(state.status === 'ready' ? state.session : null)}</>
}
