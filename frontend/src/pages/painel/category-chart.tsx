import { formatMoney, formatBPS } from '@/lib/format'
import { EmptyState } from '@/components/empty-state'
import type { CategoryBreakdown } from '@/types/api'

const PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#6366F1', '#6B7280',
  '#14B8A6', '#F97316', '#84CC16', '#A855F7',
  '#0EA5E9', '#F43F5E', '#22D3EE', '#FB923C',
]
const INSTALLMENT_COLOR = '#06B6D4'

const categoryColor = (item: CategoryBreakdown, index: number) =>
  item.category_id === '__installments__' ? INSTALLMENT_COLOR : PALETTE[index % PALETTE.length]

interface CategoryChartProps {
  data: CategoryBreakdown[]
}

export function CategoryChart({ data }: CategoryChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-ground-surface p-5">
        <p className="text-sm font-medium text-text-strong mb-4">Por categoria</p>
        <EmptyState title="Sem gastos categorizados no mês" />
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => {
    if (a.category_id === '__installments__') return 1
    if (b.category_id === '__installments__') return -1
    return b.total_cents - a.total_cents
  })

  const maxCents = Math.max(...sorted.map(d => d.total_cents), 1)

  return (
    <div className="rounded-xl border border-border bg-ground-surface p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm font-medium text-text-strong">Por categoria</p>
        <span className="text-xs text-text-muted">
          {sorted.length} {sorted.length === 1 ? 'categoria' : 'categorias'}
        </span>
      </div>

      {/* Linhas de categoria */}
      <div className="space-y-3">
        {sorted.map((item, i) => {
          const color    = categoryColor(item, i)
          const barWidth = (item.total_cents / maxCents) * 100

          return (
            <div key={item.category_id} className="flex items-center gap-3">

              {/* Indicador de cor — quadrado com cantos arredondados */}
              <span
                className="h-3 w-3 rounded-sm shrink-0"
                style={{ backgroundColor: color }}
              />

              {/* Nome — largura fixa para manter alinhamento das barras */}
              <span className="text-xs text-text w-28 shrink-0 truncate">
                {item.category_name}
              </span>

              {/* Track + barra preenchida */}
              <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-border/40">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${barWidth}%`, backgroundColor: color }}
                />
              </div>

              {/* Percentual */}
              <span className="text-xs tabular text-text-muted w-10 text-right shrink-0">
                {formatBPS(item.share_bps)}
              </span>

              {/* Valor */}
              <span className="text-xs tabular font-medium text-text-strong w-24 text-right shrink-0">
                {formatMoney(item.total_cents)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
