import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded border bg-ground-surface px-3 py-1 text-sm text-text',
        'placeholder:text-text-muted',
        'border-border focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors',
        error && 'border-negative focus:ring-negative',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
