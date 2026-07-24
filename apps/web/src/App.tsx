import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'

type HealthResponse = {
  status: string
  timestamp: string
}

async function getHealth(): Promise<HealthResponse> {
  const response = await fetch('/api/health')

  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`)
  }

  return response.json() as Promise<HealthResponse>
}

function App() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    retry: 1,
  })

  const label = health.isPending
    ? 'Checking server'
    : health.isError
      ? 'Server offline'
      : 'Server online'

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <section className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span
            className={`size-2 rounded-full ${
              health.isPending
                ? 'animate-pulse bg-muted-foreground'
                : health.isError
                  ? 'bg-destructive'
                  : 'bg-emerald-500'
            }`}
            aria-hidden="true"
          />
          {label}
        </div>

        <p className="text-sm text-muted-foreground">
          {health.isError
            ? health.error.message
            : health.data
              ? `Last checked ${new Date(health.data.timestamp).toLocaleTimeString()}`
              : 'Connecting to the API...'}
        </p>

        <Button
          variant="outline"
          onClick={() => health.refetch()}
          disabled={health.isFetching}
        >
          {health.isFetching ? 'Checking...' : 'Check again'}
        </Button>
      </section>
    </main>
  )
}

export default App
