import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonth, prevMonth, nextMonth, currentMonth } from '@/lib/format'

interface MonthPickerProps {
  value:    string
  onChange: (v: string) => void
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const max = useMemo(() => currentMonth(), [])

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-ground-surface px-3 py-1.5">
      <button
        onClick={() => onChange(prevMonth(value))}
        className="text-text-muted hover:text-text transition-colors p-0.5 rounded"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium text-text min-w-[120px] text-center">
        {formatMonth(value)}
      </span>
      <button
        onClick={() => onChange(nextMonth(value))}
        disabled={value >= max}
        className="text-text-muted hover:text-text transition-colors p-0.5 rounded disabled:opacity-30"
        aria-label="Próximo mês"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
