import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'positive' | 'negative' | 'warning' | 'muted'
}

const variants = {
  default:  'bg-brand/10 text-brand border border-brand/20',
  positive: 'bg-positive/10 text-positive border border-positive/20',
  negative: 'bg-negative/10 text-negative border border-negative/20',
  warning:  'bg-warning/10 text-warning border border-warning/20',
  muted:    'bg-ground-surface text-text-muted border border-border',
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
