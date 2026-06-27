import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline'
  size?:    'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

const variants = {
  primary:     'bg-brand text-white hover:bg-brand-hover focus-visible:ring-brand',
  secondary:   'bg-ground-surface text-text border border-border hover:bg-ground-raised',
  ghost:       'text-text-muted hover:text-text hover:bg-ground-surface',
  destructive: 'bg-negative/10 text-negative border border-negative/30 hover:bg-negative/20',
  outline:     'border border-border text-text hover:bg-ground-surface',
}

const sizes = {
  sm:   'h-7 px-3 text-xs',
  md:   'h-9 px-4 text-sm',
  lg:   'h-11 px-6 text-base',
  icon: 'h-9 w-9',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ground',
        'disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
