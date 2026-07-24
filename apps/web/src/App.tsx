import { useState } from 'react'

import { PatientSearch } from '@/features/reconciliation/patient-search'
import { ReconciliationWorkspace } from '@/features/reconciliation/reconciliation-workspace'

function App() {
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
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
            Reconciliation workspace
          </p>
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

export default App
