import { useState } from 'react'
import { addMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Trash2, PiggyBank, ShoppingCart } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { MoneyDisplay } from '@/components/money-display'
import { SkeletonCard } from '@/components/loading-skeleton'
import { ErrorMessage } from '@/components/error-message'
import { useGoals, useDeactivateGoal } from '@/hooks/use-goals'
import { useMonthSummary } from '@/hooks/use-summary'
import { formatMoney, currentMonth } from '@/lib/format'
import { GoalForm } from './goal-form'
import { ContributeForm } from './contribute-form'
import type { Goal } from '@/types/api'

// ─── helpers ────────────────────────────────────────────────────────────────

function progressBPS(goal: Goal): number {
  if (!goal.target_cents) return 0
  const bps = Math.round((goal.current_cents / goal.target_cents) * 10000)
  return Math.min(bps, 10000)
}

function projectionMonths(remaining: number, monthlyBalance: number): number | null {
  if (monthlyBalance <= 0 || remaining <= 0) return null
  return Math.ceil(remaining / monthlyBalance)
}

function projectionLabel(months: number): string {
  const d = addMonths(new Date(), months)
  const result = format(d, 'MMMM yyyy', { locale: ptBR })
  return result.charAt(0).toUpperCase() + result.slice(1)
}

// ─── GoalCard ────────────────────────────────────────────────────────────────

interface GoalCardProps {
  goal:          Goal
  monthlyBalance: number
  monthlyExpenses: number
  onContribute:  (g: Goal) => void
  onDelete:      (id: string) => void
}

function GoalCard({ goal, monthlyBalance, monthlyExpenses, onContribute, onDelete }: GoalCardProps) {
  const bps      = progressBPS(goal)
  const pct      = (bps / 100).toFixed(1)
  const remaining = goal.target_cents - goal.current_cents
  const isComplete = remaining <= 0

  // for emergency_fund the displayed target may be 0 if no summary yet
  const effectiveTarget = goal.kind === 'emergency_fund' && goal.target_cents === 0
    ? goal.target_months * monthlyExpenses
    : goal.target_cents

  const months = isComplete ? null : projectionMonths(
    effectiveTarget - goal.current_cents,
    monthlyBalance,
  )

  const IconComp = goal.kind === 'emergency_fund' ? PiggyBank : ShoppingCart
  const kindLabel = goal.kind === 'emergency_fund' ? 'Reserva de emergência' : 'Compra planejada'

  return (
    <div className="rounded-xl border border-border bg-ground-surface p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: `${goal.color}22` }}>
            <IconComp className="h-5 w-5" style={{ color: goal.color }} />
          </div>
          <div>
            <p className="font-medium leading-tight">{goal.name}</p>
            <p className="text-xs text-subtle">{kindLabel}</p>
          </div>
        </div>
        <button
          onClick={() => onDelete(goal.id)}
          className="text-subtle hover:text-negative transition-colors"
          title="Arquivar meta"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{formatMoney(goal.current_cents)}</span>
          <span className="text-subtle">
            {effectiveTarget > 0 ? `de ${formatMoney(effectiveTarget)}` : '—'}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${bps / 100}%`, background: goal.color }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-subtle">
          <span>{pct}% concluído</span>
          {!isComplete && effectiveTarget > 0 && (
            <span>{formatMoney(Math.max(0, effectiveTarget - goal.current_cents))} restante</span>
          )}
        </div>
      </div>

      {/* Projection */}
      {!isComplete && (
        <div className="rounded-lg bg-ground-subtle px-3 py-2 text-xs text-subtle">
          {months !== null ? (
            <>Previsão de conclusão: <span className="text-text font-medium">{projectionLabel(months)}</span> ({months} {months === 1 ? 'mês' : 'meses'})</>
          ) : monthlyBalance <= 0 ? (
            <>Sem saldo disponível para projeção</>
          ) : (
            <>Meta já atingida!</>
          )}
          {goal.deadline && (
            <> · Prazo: <span className="text-text font-medium">{goal.deadline}</span></>
          )}
        </div>
      )}

      {isComplete && (
        <div className="rounded-lg bg-positive/10 px-3 py-2 text-xs text-positive font-medium">
          Meta concluída!
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => onContribute(goal)}
        disabled={isComplete}
      >
        Registrar aporte
      </Button>
    </div>
  )
}

// ─── MetasPage ───────────────────────────────────────────────────────────────

export default function MetasPage() {
  const [showForm, setShowForm]   = useState(false)
  const [contrib, setContrib]     = useState<Goal | null>(null)

  const { data: goals, isLoading, error } = useGoals(true)
  const { data: summary } = useMonthSummary(currentMonth())
  const deactivate = useDeactivateGoal()

  const monthlyBalance  = summary?.balance_cents ?? 0
  const monthlyExpenses = summary
    ? (summary.fixed_expense_cents + summary.variable_expense_cents) / 100 * 100 // keep in cents
    : 0

  function handleDelete(id: string) {
    if (confirm('Arquivar esta meta?')) {
      deactivate.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metas"
        action={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova meta
          </Button>
        }
      />

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {error && <ErrorMessage message="Não foi possível carregar as metas." />}

      {!isLoading && !error && goals && goals.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <PiggyBank className="mb-3 h-10 w-10 text-subtle" />
          <p className="text-subtle">Nenhuma meta cadastrada.</p>
          <p className="mt-1 text-xs text-subtle">Crie uma reserva de emergência ou planeje uma compra.</p>
          <Button className="mt-4" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova meta
          </Button>
        </div>
      )}

      {goals && goals.length > 0 && (
        <>
          {/* Saldo disponível para projeção */}
          {summary && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-ground-subtle px-4 py-3 text-sm">
              <span className="text-subtle">Saldo mensal disponível para aportes:</span>
              <MoneyDisplay cents={monthlyBalance} className="font-semibold" />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                monthlyBalance={monthlyBalance}
                monthlyExpenses={monthlyExpenses}
                onContribute={setContrib}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      <GoalForm open={showForm} onClose={() => setShowForm(false)} summary={summary} />

      {contrib && (
        <ContributeForm
          open={true}
          onClose={() => setContrib(null)}
          goal={contrib}
        />
      )}
    </div>
  )
}
