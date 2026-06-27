import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorMessageProps {
  message?: string
  onRetry?: () => void
}

export function ErrorMessage({
  message = 'Não foi possível carregar os dados.',
  onRetry,
}: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="rounded-xl bg-negative/10 border border-negative/20 p-4">
        <AlertTriangle className="h-7 w-7 text-negative" />
      </div>
      <p className="text-sm text-text-muted text-center max-w-xs">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
