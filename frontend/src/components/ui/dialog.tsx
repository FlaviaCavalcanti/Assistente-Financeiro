import * as RadixDialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type ReactNode } from 'react'

interface DialogProps {
  open:     boolean
  onClose:  () => void
  title:    string
  children: ReactNode
  className?: string
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <RadixDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-lg rounded-xl bg-ground-surface shadow-modal',
            'border border-border',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            className
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <RadixDialog.Title className="text-base font-semibold text-text-strong">
              {title}
            </RadixDialog.Title>
            <RadixDialog.Close asChild>
              <button className="rounded p-1 text-text-muted hover:text-text hover:bg-ground-raised transition-colors">
                <X className="h-4 w-4" />
              </button>
            </RadixDialog.Close>
          </div>
          <div className="p-6">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
