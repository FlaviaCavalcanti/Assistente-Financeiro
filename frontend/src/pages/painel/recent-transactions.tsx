import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { MoneyDisplay } from '@/components/money-display'
import { useTransactions } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { formatDate } from '@/lib/format'
import { SkeletonTable } from '@/components/loading-skeleton'

export function RecentTransactions() {
  const { data, isLoading } = useTransactions({ limit: 5, page: 1 })
  const { data: categories } = useCategories()

  const catMap = Object.fromEntries((categories ?? []).map(c => [c.id, c]))

  return (
    <div className="rounded-xl border border-border bg-ground-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-text-strong">Últimos lançamentos</p>
        <Link
          to="/extrato"
          className="text-xs text-brand hover:text-brand-hover flex items-center gap-1 transition-colors"
        >
          Ver todos <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : !(data?.items ?? []).length ? (
        <p className="text-xs text-text-muted text-center py-8">Nenhum lançamento ainda.</p>
      ) : (
        <div className="space-y-1">
          {(data?.items ?? []).map(tx => {
            const cat = catMap[tx.category_id]
            return (
              <div key={tx.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-ground-raised transition-colors">
                <span className="text-xs tabular text-text-muted w-12 shrink-0">
                  {formatDate(tx.date, 'dd/MM')}
                </span>
                <span className="text-sm text-text flex-1 truncate">{tx.description}</span>
                {cat && (
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                    title={cat.name}
                  />
                )}
                <MoneyDisplay
                  cents={tx.direction === 'debit' ? -tx.amount_cents : tx.amount_cents}
                  showSign
                  size="sm"
                  className="shrink-0"
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
