import { SessionGate } from './components/SessionGate'
import { SlotMachine } from './components/SlotMachine'
import { SlotMachineCanvas } from './components/SlotMachineCanvas'

const view = new URLSearchParams(window.location.search).get('view')

export default function App() {
  return (
    <SessionGate>
      {session =>
        view === 'canvas'
          ? <SlotMachineCanvas session={session} />
          : <SlotMachine session={session} />
      }
    </SessionGate>
  )
}
