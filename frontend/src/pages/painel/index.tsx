import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { MonthPicker } from '@/components/month-picker'
import { SummaryCards } from './summary-cards'
import { CategoryChart } from './category-chart'
import { RecentTransactions } from './recent-transactions'
import { JuliusCard } from '@/components/julius-card'
import { useMonthSummary } from '@/hooks/use-summary'
import { currentMonth } from '@/lib/format'
import { getJuliusQuote, getSummaryContext } from '@/lib/julius'
import { SkeletonSummaryCards } from '@/components/loading-skeleton'
import { ErrorMessage } from '@/components/error-message'

export default function PainelPage() {
  const [month, setMonth]           = useState(currentMonth)
  const [dismissed, setDismissed]   = useState(false)
  const { data: summary, isLoading, isError, refetch } = useMonthSummary(month)

  // Recalcula quando o mês muda — novo mês = nova mensagem
  const juliusQuote = useMemo(() => {
    if (!summary) return null
    const ctx = getSummaryContext(summary)
    return ctx ? { context: ctx, quote: getJuliusQuote(ctx) } : null
  }, [summary?.month, summary?.balance_cents, summary?.installment_commitment_cents])

  const handleMonthChange = (m: string) => {
    setMonth(m)
    setDismissed(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel"
        extra={<MonthPicker value={month} onChange={handleMonthChange} />}
      />

      {isLoading && <SkeletonSummaryCards />}
      {isError  && <ErrorMessage onRetry={refetch} />}

      {summary && (
        <>
          <SummaryCards summary={summary} />

          {juliusQuote && !dismissed && (
            <JuliusCard
              quote={juliusQuote.quote}
              variant="insight"
              onDismiss={() => setDismissed(true)}
            />
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CategoryChart data={summary.by_category} />
            <RecentTransactions month={month} />
          </div>
        </>
      )}
    </div>
  )
}
