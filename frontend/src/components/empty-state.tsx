import { PackageOpen, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon?:       LucideIcon
  title:       string
  description?: string
  action?:     { label: string; onClick: () => void }
}

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="rounded-xl bg-ground-surface border border-border p-4">
        <Icon className="h-8 w-8 text-text-muted" />
      </div>
      <p className="text-sm font-medium text-text">{title}</p>
      {description && <p className="text-xs text-text-muted max-w-xs">{description}</p>}
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  )
}
