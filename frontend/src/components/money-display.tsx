import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/format'

export interface MoneyDisplayProps {
  cents:         number
  showSign?:     boolean
  colorize?:     boolean
  forcePositive?: boolean
  forceNegative?: boolean
  size?:         'sm' | 'md' | 'lg' | 'xl'
  className?:    string
}

const sizes = {
  sm: 'text-sm',
  md: 'text-amount',
  lg: 'text-amount-lg',
  xl: 'text-amount-xl',
}

export function MoneyDisplay({
  cents,
  showSign      = false,
  colorize      = true,
  forcePositive = false,
  forceNegative = false,
  size          = 'md',
  className,
}: MoneyDisplayProps) {
  const isPositive = forcePositive || (!forceNegative && cents >= 0)
  const formatted  = formatMoney(Math.abs(cents))
  const sign       = showSign ? (isPositive ? '+' : '−') : cents < 0 ? '−' : ''
  const display    = `${sign}${formatted}`

  return (
    <span
      className={cn(
        'tabular',
        sizes[size],
        forcePositive && 'text-positive',
        forceNegative && 'text-negative',
        !forcePositive && !forceNegative && colorize && (isPositive ? 'text-positive' : 'text-negative'),
        !forcePositive && !forceNegative && !colorize && 'text-text-strong',
        className
      )}
    >
      {display}
    </span>
  )
}
