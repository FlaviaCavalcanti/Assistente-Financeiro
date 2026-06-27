import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { MonthPicker } from '@/components/month-picker'
import { SummaryCards } from './summary-cards'
import { CategoryChart } from './category-chart'
import { RecentTransactions } from './recent-transactions'
import { useMonthSummary } from '@/hooks/use-summary'
import { currentMonth } from '@/lib/format'
import { SkeletonSummaryCards } from '@/components/loading-skeleton'
import { ErrorMessage } from '@/components/error-message'

export default function PainelPage() {
  const [month, setMonth] = useState(currentMonth)
  const { data: summary, isLoading, isError, refetch } = useMonthSummary(month)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel"
        extra={<MonthPicker value={month} onChange={setMonth} />}
      />

      {isLoading && <SkeletonSummaryCards />}
      {isError  && <ErrorMessage onRetry={refetch} />}

      {summary && (
        <>
          <SummaryCards summary={summary} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CategoryChart data={summary.by_category} />
            <RecentTransactions month={month} />
          </div>
        </>
      )}
    </div>
  )
}
