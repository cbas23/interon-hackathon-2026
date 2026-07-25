import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ProviderChooser } from '@/features/auth/provider-chooser'
import { PatientSearch } from '@/features/reconciliation/patient-search'
import { ReconciliationWorkspace } from '@/features/reconciliation/reconciliation-workspace'

function DemoWorkspace({ onExit }: { onExit: () => void }) {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  )

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-2.5 font-semibold tracking-tight">
            <img
              src="/logo.png"
              alt=""
              width="36"
              height="36"
              className="size-9"
            />
            RecMeds
          </div>
          <div className="flex items-center gap-8">
            <span className="hidden font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground sm:inline">
              Medication Reconciliation Workspace
            </span>
            <Button variant="default" size="default" onClick={onExit}>
              <LogOut data-icon="inline-start" />
              Exit
            </Button>
          </div>
        </div>
      </header>

      {selectedPatientId ? (
        <ReconciliationWorkspace
          patientId={selectedPatientId}
          onBack={() => setSelectedPatientId(null)}
        />
      ) : (
        <PatientSearch onSelect={setSelectedPatientId} />
      )}
    </div>
  )
}

function App() {
  const [demoMode, setDemoMode] = useState(false)
  const queryClient = useQueryClient()

  function exitDemo() {
    queryClient.clear()
    setDemoMode(false)
  }

  if (demoMode) {
    return <DemoWorkspace onExit={exitDemo} />
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-2.5 font-semibold tracking-tight">
            <img
              src="/logo.png"
              alt=""
              width="36"
              height="36"
              className="size-9"
            />
            RecMeds
          </div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
            SMART connection
          </p>
        </div>
      </header>
      <ProviderChooser onOpenDemo={() => setDemoMode(true)} />
    </div>
  )
}

export default App
