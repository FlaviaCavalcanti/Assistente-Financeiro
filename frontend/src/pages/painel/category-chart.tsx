import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMoney, formatBPS } from '@/lib/format'
import { EmptyState } from '@/components/empty-state'
import type { CategoryBreakdown } from '@/types/api'

const CHART_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#6366F1','#6B7280']
const INSTALLMENT_COLOR = '#06B6D4' // cyan-500 — reservado para Parcelamentos
const chartColor = (item: CategoryBreakdown, i: number) =>
  item.category_id === '__installments__' ? INSTALLMENT_COLOR : CHART_COLORS[i % CHART_COLORS.length]

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

  return (
    <div className="rounded-xl border border-border bg-ground-surface p-5">
      <p className="text-sm font-medium text-text-strong mb-4">Por categoria</p>
      <div className="flex flex-col gap-4">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="total_cents"
            >
              {data.map((entry, i) => (
                <Cell key={entry.category_id} fill={chartColor(entry, i)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [formatMoney(typeof value === 'number' ? value : 0), '']}
              contentStyle={{
                backgroundColor: '#131F2E',
                border: '1px solid #1E3550',
                borderRadius: '8px',
                color: '#D6E4EF',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="space-y-2">
          {data.map((item, i) => (
            <div key={item.category_id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: chartColor(item, i) }}
                />
                <span className="text-xs text-text truncate">{item.category_name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs tabular text-text-muted">{formatBPS(item.share_bps)}</span>
                <span className="text-xs tabular text-text">{formatMoney(item.total_cents)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
