import { useEffect, useState } from 'react'
import type { SessionData } from '../types'

type SessionState =
  | { status: 'loading' }
  | { status: 'ready'; session: SessionData }
  | { status: 'dev' }            // sin token en URL → modo desarrollo
  | { status: 'error'; message: string }

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: 'loading' })

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('session')

    if (!token) {
      setState({ status: 'dev' })
      return
    }

    fetch(`/api/v1/sessions/${token}`)
      .then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({ detail: 'Error de servidor' }))
          throw new Error(err.detail ?? 'Sesión inválida')
        }
        return r.json() as Promise<SessionData>
      })
      .then(data => {
        if (data.status === 'expired') throw new Error('La sesión ha expirado')
        if (data.status === 'closed')  throw new Error('La sesión ya fue cerrada')
        setState({ status: 'ready', session: data })
      })
      .catch(e => setState({ status: 'error', message: (e as Error).message }))
  }, [])

  return state
}
