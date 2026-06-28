import { useState } from 'react'
import { Plus, Pencil, Repeat, Zap } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MoneyDisplay } from '@/components/money-display'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { JuliusCard } from '@/components/julius-card'
import { IncomeForm } from './income-form'
import { useIncomeSources, useDeactivateIncomeSource } from '@/hooks/use-income-sources'
import { SkeletonCard } from '@/components/loading-skeleton'
import { ErrorMessage } from '@/components/error-message'
import { EmptyState } from '@/components/empty-state'
import { formatMonth } from '@/lib/format'
import { getJuliusQuote } from '@/lib/julius'
import type { IncomeSource } from '@/types/api'

const recurrenceLabel: Record<string, string> = {
  monthly: 'Mensal', weekly: 'Semanal', biweekly: 'Quinzenal', none: '—',
}

function formatPeriod(first: string, last: string): string {
  if (!first) return ''
  const start = formatMonth(first)
  if (!last || last === first) return start
  return `${start} – ${formatMonth(last)}`
}

export default function RendaPage() {
  const [showForm, setShowForm]       = useState(false)
  const [editing, setEditing]         = useState<IncomeSource | undefined>()
  const [deleting, setDeleting]       = useState<IncomeSource | undefined>()
  const [juliusQuote, setJuliusQuote] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useIncomeSources(true)
  const deactivateMut = useDeactivateIncomeSource()

  const recurring = (data ?? []).filter(i => i.kind === 'recurring')
  const oneTime   = (data ?? []).filter(i => i.kind === 'one_time')

  const handleDeactivate = async () => {
    if (!deleting) return
    await deactivateMut.mutateAsync(deleting.id)
    setDeleting(undefined)
  }

  if (isLoading) return (
    <div className="space-y-6">
      <PageHeader title="Renda" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )

  if (isError) return (
    <div className="space-y-6">
      <PageHeader title="Renda" />
      <ErrorMessage onRetry={refetch} />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Renda"
        action={
          <Button size="sm" onClick={() => { setEditing(undefined); setShowForm(true) }}>
            <Plus className="h-4 w-4" /> Nova fonte
          </Button>
        }
      />

      {!(data ?? []).length && (
        <EmptyState
          icon={Zap}
          title="Nenhuma fonte de renda cadastrada"
          action={{ label: 'Adicionar renda', onClick: () => setShowForm(true) }}
        />
      )}

      {recurring.length > 0 && (
        <section>
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-3">Recorrente</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {recurring.map(source => (
              <IncomeCard
                key={source.id}
                source={source}
                onEdit={() => { setEditing(source); setShowForm(true) }}
                onDeactivate={() => setDeleting(source)}
              />
            ))}
          </div>
        </section>
      )}

      {oneTime.length > 0 && (
        <section>
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted mb-3">Avulsa</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {oneTime.map(source => (
              <IncomeCard
                key={source.id}
                source={source}
                onEdit={() => { setEditing(source); setShowForm(true) }}
                onDeactivate={() => setDeleting(source)}
              />
            ))}
          </div>
        </section>
      )}

      {juliusQuote && (
        <JuliusCard
          quote={juliusQuote}
          variant="toast"
          onDismiss={() => setJuliusQuote(null)}
        />
      )}

      <IncomeForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(undefined) }}
        editing={editing}
        onCreated={(kind) => {
          if (kind === 'one_time') {
            setJuliusQuote(getJuliusQuote('extra_income'))
          } else if ((data ?? []).length >= 1) {
            // já tinha pelo menos uma fonte antes de criar esta
            setJuliusQuote(getJuliusQuote('second_job'))
          }
        }}
      />

      <AlertDialog
        open={!!deleting}
        title="Desativar fonte de renda"
        description={`Deseja desativar "${deleting?.name}"? Os dados históricos serão mantidos.`}
        confirmLabel="Desativar"
        onConfirm={handleDeactivate}
        onCancel={() => setDeleting(undefined)}
        loading={deactivateMut.isPending}
      />
    </div>
  )
}

function IncomeCard({ source, onEdit, onDeactivate }: {
  source: IncomeSource
  onEdit: () => void
  onDeactivate: () => void
}) {
  return (
    <div className="rounded-xl border border-border bg-ground-surface p-5 shadow-card space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {source.kind === 'recurring'
            ? <Repeat className="h-4 w-4 text-positive" />
            : <Zap className="h-4 w-4 text-warning" />
          }
          <span className="font-medium text-text-strong">{source.name}</span>
        </div>
        <Badge variant={source.kind === 'recurring' ? 'positive' : 'muted'}>
          {source.kind === 'recurring' ? 'Recorrente' : 'Avulsa'}
        </Badge>
      </div>

      <div className="flex items-center gap-4">
        {source.gross_cents > 0 && (
          <div>
            <p className="text-xs text-text-muted mb-0.5">Bruto</p>
            <MoneyDisplay cents={source.gross_cents} colorize={false} size="sm" />
          </div>
        )}
        <div>
          <p className="text-xs text-text-muted mb-0.5">Líquido</p>
          <MoneyDisplay cents={source.net_cents} forcePositive size="md" />
        </div>
        {source.kind === 'recurring' && (
          <div className="ml-auto text-right">
            <p className="text-xs text-text-muted mb-0.5">{recurrenceLabel[source.recurrence]}</p>
            <p className="text-sm tabular text-text">Dia {source.day_of_month}</p>
          </div>
        )}
        {source.kind === 'one_time' && source.first_month && (
          <div className="ml-auto text-right">
            <p className="text-xs text-text-muted mb-0.5">Período</p>
            <p className="text-sm text-text">{formatPeriod(source.first_month, source.last_month)}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
        <Button variant="ghost" size="sm" onClick={onDeactivate} className="text-text-muted hover:text-negative">
          Desativar
        </Button>
      </div>
    </div>
  )
}

