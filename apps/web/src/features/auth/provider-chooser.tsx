import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const unsupportedProviders = [
  {
    id: 'epic',
    name: 'Epic',
    logo: '/providers/epic.svg',
  },
  {
    id: 'oracle-health',
    name: 'Oracle Health',
    logo: '/providers/oracle.svg',
  },
  {
    id: 'meditech',
    name: 'MEDITECH',
    logo: '/providers/meditech.svg',
  },
  {
    id: 'athenahealth',
    name: 'athenahealth',
    logo: '/providers/athenahealth.svg',
  },
] as const

export function ProviderChooser({ onOpenDemo }: { onOpenDemo: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 items-start px-5 py-10 sm:items-center sm:py-16 lg:px-8">
      <Card className="w-full shadow-lg shadow-primary/5">
        <CardHeader className="border-b">
          <CardTitle className="pt-1 text-2xl">Connect an EHR</CardTitle>
          <CardDescription>Choose a provider or use the demo.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {unsupportedProviders.map((provider) => (
              <Button
                key={provider.id}
                variant="outline"
                className="h-16 w-full justify-between px-4"
                aria-label={`${provider.name} integration planned`}
                disabled
              >
                <img
                  src={provider.logo}
                  alt={`${provider.name} logo`}
                  className="max-h-8 w-32 object-contain object-left"
                />
              </Button>
            ))}
            <Button
              variant="outline"
              className="h-16 w-full justify-between px-4"
              aria-label="Open demo EHR"
              onClick={onOpenDemo}
            >
              <span className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Demo EHR logo"
                  width="36"
                  height="36"
                  className="size-9"
                />
                <span className="text-xl">Demo EHR</span>
              </span>
              <span className="flex items-center gap-2">
                <ArrowRight data-icon="inline-end" />
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
