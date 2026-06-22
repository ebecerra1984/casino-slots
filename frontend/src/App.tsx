import { SessionGate } from './components/SessionGate'
import { SlotMachine } from './components/SlotMachine'

export default function App() {
  return (
    <SessionGate>
      {session => <SlotMachine session={session} />}
    </SessionGate>
  )
}
