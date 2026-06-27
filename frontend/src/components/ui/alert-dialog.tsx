import * as RadixAlert from '@radix-ui/react-alert-dialog'
import { Button } from './button'

interface AlertDialogProps {
  open:          boolean
  onConfirm:     () => void
  onCancel:      () => void
  title:         string
  description:   string
  confirmLabel?: string
  loading?:      boolean
}

export function AlertDialog({
  open, onConfirm, onCancel, title, description,
  confirmLabel = 'Remover', loading,
}: AlertDialogProps) {
  return (
    <RadixAlert.Root open={open} onOpenChange={v => !v && onCancel()}>
      <RadixAlert.Portal>
        <RadixAlert.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <RadixAlert.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl bg-ground-surface border border-border shadow-modal p-6">
          <RadixAlert.Title className="text-base font-semibold text-text-strong mb-2">
            {title}
          </RadixAlert.Title>
          <RadixAlert.Description className="text-sm text-text-muted mb-6">
            {description}
          </RadixAlert.Description>
          <div className="flex justify-end gap-3">
            <RadixAlert.Cancel asChild>
              <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
            </RadixAlert.Cancel>
            <RadixAlert.Action asChild>
              <Button variant="destructive" onClick={onConfirm} loading={loading}>
                {confirmLabel}
              </Button>
            </RadixAlert.Action>
          </div>
        </RadixAlert.Content>
      </RadixAlert.Portal>
    </RadixAlert.Root>
  )
}
