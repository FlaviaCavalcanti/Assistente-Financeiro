import { useState } from 'react'
import { addMonths, parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CheckCircle2, AlertTriangle, XCircle,
  TrendingUp, Wallet, CreditCard, Receipt, Landmark,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { MonthPicker } from '@/components/month-picker'
import { MoneyDisplay } from '@/components/money-display'
import { SkeletonCard } from '@/components/loading-skeleton'
import { ErrorMessage } from '@/components/error-message'
import { useMonthSummary } from '@/hooks/use-summary'
import { useDebts } from '@/hooks/use-debts'
import { useInstallmentPlans } from '@/hooks/use-installment-plans'
import { useCategories } from '@/hooks/use-categories'
import { formatMoney, currentMonth } from '@/lib/format'
import type { Summary, Debt, InstallmentPlan, Category } from '@/types/api'

// ─── helpers ────────────────────────────────────────────────────────────────

function pct(value: number, total: number): number {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

function healthColor(level: 'ok' | 'warn' | 'bad') {
  return {
    ok:   { icon: CheckCircle2,  iconCls: 'text-positive', badge: 'bg-positive/10 text-positive border-positive/20' },
    warn: { icon: AlertTriangle, iconCls: 'text-warning',  badge: 'bg-warning/10  text-warning  border-warning/20'  },
    bad:  { icon: XCircle,       iconCls: 'text-negative', badge: 'bg-negative/10 text-negative border-negative/20' },
  }[level]
}

function commitmentLevel(pctValue: number): 'ok' | 'warn' | 'bad' {
  if (pctValue < 50) return 'ok'
  if (pctValue < 70) return 'warn'
  return 'bad'
}

function projectionDate(fromDate: string, remainingMonths: number): string {
  try {
    const end = addMonths(parseISO(fromDate), remainingMonths - 1)
    const result = format(end, 'MMMM yyyy', { locale: ptBR })
    return result.charAt(0).toUpperCase() + result.slice(1)
  } catch {
    return '—'
  }
}

function loanProjectionDate(remainingMonths: number): string {
  const end = addMonths(new Date(), remainingMonths)
  const result = format(end, 'MMMM yyyy', { locale: ptBR })
  return result.charAt(0).toUpperCase() + result.slice(1)
}

// ─── HealthIndicators ────────────────────────────────────────────────────────

function HealthCard({
  title, subtitle, level, value,
}: {
  title: string
  subtitle: string
  level: 'ok' | 'warn' | 'bad'
  value: string
}) {
  const { icon: Icon, iconCls, badge } = healthColor(level)
  return (
    <div className="rounded-xl border border-border bg-ground-surface p-5 shadow-card">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wider text-text-muted">{title}</p>
        <Icon className={`h-4 w-4 ${iconCls}`} />
      </div>
      <p className={`text-2xl font-semibold font-mono ${iconCls}`}>{value}</p>
      <p className={`mt-2 inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${badge}`}>
        {subtitle}
      </p>
    </div>
  )
}

function HealthIndicators({ summary }: { summary: Summary }) {
  const income = summary.income_total_cents
  const committed = summary.fixed_expense_cents + summary.debt_commitment_cents + summary.installment_commitment_cents
  const commitPct  = pct(committed, income)
  const debtPct    = pct(summary.debt_commitment_cents + summary.installment_commitment_cents, income)
  const balance    = summary.balance_cents

  const balanceLevel: 'ok' | 'warn' | 'bad' = balance > 0 ? 'ok' : balance === 0 ? 'warn' : 'bad'
  const commitLvl = commitmentLevel(commitPct)
  const debtLevel: 'ok' | 'warn' | 'bad' = debtPct < 30 ? 'ok' : debtPct < 50 ? 'warn' : 'bad'

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <HealthCard
        title="Saldo do mês"
        value={formatMoney(Math.abs(balance))}
        subtitle={balance >= 0 ? 'Positivo — bom!' : 'Negativo — atenção!'}
        level={balanceLevel}
      />
      <HealthCard
        title="Comprometimento"
        value={`${commitPct}%`}
        subtitle={
          commitLvl === 'ok'   ? 'Abaixo de 50% — saudável' :
          commitLvl === 'warn' ? 'Entre 50-70% — atenção'   :
                                 'Acima de 70% — crítico'
        }
        level={commitLvl}
      />
      <HealthCard
        title="Endividamento"
        value={`${debtPct}%`}
        subtitle={
          debtLevel === 'ok'   ? 'Abaixo de 30% — saudável' :
          debtLevel === 'warn' ? 'Entre 30-50% — atenção'   :
                                 'Acima de 50% — alto'
        }
        level={debtLevel}
      />
    </div>
  )
}

// ─── IncomeCommitment ────────────────────────────────────────────────────────

function CommitmentRow({
  label, cents, income, color, icon: Icon,
}: {
  label: string; cents: number; income: number; color: string; icon: typeof Wallet
}) {
  const p = pct(cents, income)
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-text-muted" />
      <span className="w-40 text-sm text-text shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(p, 100)}%`, backgroundColor: color }} />
      </div>
      <span className="w-12 text-right text-xs tabular text-text-muted">{p}%</span>
      <span className="w-28 text-right tabular text-sm text-text">{formatMoney(cents)}</span>
    </div>
  )
}

function IncomeCommitment({ summary }: { summary: Summary }) {
  const income    = summary.income_total_cents
  const fixed     = summary.fixed_expense_cents
  const debt      = summary.debt_commitment_cents
  const inst      = summary.installment_commitment_cents
  const variable  = summary.variable_expense_cents
  const committed = fixed + debt + inst
  const available = income - committed - variable
  const commitPct = pct(committed, income)

  const barColor = commitPct < 50 ? '#2DD4BF' : commitPct < 70 ? '#FBBF24' : '#FB7185'

  return (
    <div className="rounded-xl border border-border bg-ground-surface p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-strong">Comprometimento de Renda</h2>
        <div className="text-right">
          <p className="text-xs text-text-muted">Renda total</p>
          <MoneyDisplay cents={income} forcePositive size="sm" />
        </div>
      </div>

      {/* barra global */}
      <div>
        <div className="flex justify-between text-xs text-text-muted mb-1">
          <span>Comprometido: {commitPct}%</span>
          <span>Livre: {pct(Math.max(available, 0), income)}%</span>
        </div>
        <div className="h-3 rounded-full bg-border overflow-hidden flex">
          <div className="h-full rounded-l-full transition-all" style={{ width: `${pct(fixed, income)}%`, backgroundColor: '#818CF8' }} />
          <div className="h-full transition-all" style={{ width: `${pct(debt, income)}%`, backgroundColor: '#FB7185' }} />
          <div className="h-full transition-all" style={{ width: `${pct(inst, income)}%`, backgroundColor: '#FBBF24' }} />
          <div className="h-full transition-all" style={{ width: `${pct(variable, income)}%`, backgroundColor: '#5E8097' }} />
        </div>
        <div className="flex gap-4 mt-2 flex-wrap">
          {[
            { color: '#818CF8', label: 'Fixos' },
            { color: '#FB7185', label: 'Dívidas' },
            { color: '#FBBF24', label: 'Parcelas' },
            { color: '#5E8097', label: 'Variáveis' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-text-muted">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-1 border-t border-border/50">
        <CommitmentRow label="Gastos fixos"    cents={fixed}    income={income} color="#818CF8" icon={Wallet}   />
        <CommitmentRow label="Dívidas"         cents={debt}     income={income} color="#FB7185" icon={CreditCard} />
        <CommitmentRow label="Parcelamentos"   cents={inst}     income={income} color="#FBBF24" icon={Receipt}  />
        <CommitmentRow label="Gasto variável"  cents={variable} income={income} color="#5E8097" icon={TrendingUp} />
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-border/50">
        <span className="text-sm font-medium text-text-muted">Disponível estimado</span>
        <MoneyDisplay cents={Math.max(available, 0)} forcePositive size="sm" />
      </div>

      {available < 0 && (
        <p className="text-xs text-negative bg-negative/10 border border-negative/20 rounded px-3 py-2">
          Seus compromissos superam a renda declarada em {formatMoney(Math.abs(available))}. Confira se há renda não cadastrada.
        </p>
      )}

      <div className="text-xs text-text-muted">
        <span className="inline-block w-2.5 h-2.5 rounded-full align-middle mr-1" style={{ backgroundColor: barColor }} />
        Comprometimento total: {commitPct}% da renda
      </div>
    </div>
  )
}

// ─── CategoryBreakdown ───────────────────────────────────────────────────────

function CategoryBreakdown({ summary, categories }: { summary: Summary; categories: Category[] }) {
  const income    = summary.income_total_cents
  const catMap    = Object.fromEntries(categories.map(c => [c.id, c]))
  const breakdown = [...summary.by_category].sort((a, b) => b.total_cents - a.total_cents)

  if (!breakdown.length) {
    return (
      <div className="rounded-xl border border-border bg-ground-surface p-5 shadow-card">
        <h2 className="text-sm font-semibold text-text-strong mb-3">Gastos por Categoria</h2>
        <p className="text-sm text-text-muted">Nenhum gasto categorizado no período.</p>
      </div>
    )
  }

  const maxCents = breakdown[0].total_cents

  return (
    <div className="rounded-xl border border-border bg-ground-surface p-5 shadow-card space-y-4">
      <h2 className="text-sm font-semibold text-text-strong">Gastos por Categoria</h2>

      <div className="space-y-3">
        {breakdown.map(item => {
          const cat    = catMap[item.category_id]
          const color  = cat?.color ?? '#6B7280'
          const pctInc = pct(item.total_cents, income)
          const barPct = pct(item.total_cents, maxCents)
          return (
            <div key={item.category_id} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-sm text-text truncate">{item.category_name}</span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: color }} />
                </div>
              </div>
              <span className="text-xs tabular text-text-muted text-right w-10">{pctInc}%</span>
              <span className="tabular text-sm text-text text-right w-28">{formatMoney(item.total_cents)}</span>
            </div>
          )
        })}
      </div>

      {income > 0 && (
        <p className="text-xs text-text-muted pt-2 border-t border-border/50">
          Percentuais calculados sobre a renda total de {formatMoney(income)}.
        </p>
      )}
    </div>
  )
}

// ─── PayoffProjections ───────────────────────────────────────────────────────

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const p = total > 0 ? Math.min(Math.round((value / total) * 100), 100) : 0
  return (
    <div className="h-2 rounded-full bg-border overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, backgroundColor: color }} />
    </div>
  )
}

function InstallmentProjectionCard({ plan }: { plan: InstallmentPlan }) {
  const remaining = plan.total_installments - plan.paid_installments
  if (remaining <= 0) return null

  const endDate = projectionDate(plan.first_due_date, remaining)

  return (
    <div className="rounded-lg border border-border bg-ground-raised p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Receipt className="h-4 w-4 shrink-0 text-warning" />
          <span className="text-sm font-medium text-text-strong truncate">{plan.description}</span>
        </div>
        <span className="text-xs tabular text-text-muted whitespace-nowrap">
          {plan.paid_installments}/{plan.total_installments}x · {formatMoney(plan.installment_amount_cents)}/mês
        </span>
      </div>
      <ProgressBar value={plan.paid_installments} total={plan.total_installments} color="#FBBF24" />
      <div className="flex justify-between text-xs text-text-muted">
        <span>{Math.round((plan.paid_installments / plan.total_installments) * 100)}% pago</span>
        <span>
          Termina em <span className="text-text font-medium">{endDate}</span>
          {remaining > 1 && <span className="text-text-muted"> ({remaining} meses)</span>}
        </span>
      </div>
    </div>
  )
}

function LoanProjectionCard({ debt }: { debt: Debt }) {
  const remaining = debt.total_installments - debt.paid_installments
  if (remaining <= 0 || debt.kind !== 'loan') return null

  const endDate = loanProjectionDate(remaining)
  const paidPct = Math.round((debt.paid_installments / debt.total_installments) * 100)

  return (
    <div className="rounded-lg border border-border bg-ground-raised p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Landmark className="h-4 w-4 shrink-0 text-brand" />
          <span className="text-sm font-medium text-text-strong truncate">{debt.name}</span>
        </div>
        <span className="text-xs tabular text-text-muted whitespace-nowrap">
          {debt.paid_installments}/{debt.total_installments}x · {formatMoney(debt.monthly_payment_cents)}/mês
        </span>
      </div>
      <ProgressBar value={debt.paid_installments} total={debt.total_installments} color="#818CF8" />
      <div className="flex justify-between text-xs text-text-muted">
        <span>{paidPct}% pago · Restante {formatMoney(debt.remaining_balance_cents)}</span>
        <span>
          Quita em <span className="text-text font-medium">{endDate}</span>
          <span className="text-text-muted"> (~{remaining} meses)</span>
        </span>
      </div>
    </div>
  )
}

function PayoffProjections({
  debts, plans,
}: {
  debts: Debt[]
  plans: InstallmentPlan[]
}) {
  const loans = debts.filter(d => d.kind === 'loan' && d.total_installments > 0 && d.paid_installments < d.total_installments)
  const activePlans = plans.filter(p => p.paid_installments < p.total_installments)

  if (!loans.length && !activePlans.length) {
    return (
      <div className="rounded-xl border border-border bg-ground-surface p-5 shadow-card">
        <h2 className="text-sm font-semibold text-text-strong mb-3">Projeção de Quitação</h2>
        <p className="text-sm text-text-muted">Nenhum empréstimo ou parcelamento ativo.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-ground-surface p-5 shadow-card space-y-3">
      <h2 className="text-sm font-semibold text-text-strong">Projeção de Quitação</h2>

      {loans.map(d => <LoanProjectionCard key={d.id} debt={d} />)}
      {activePlans.map(p => <InstallmentProjectionCard key={p.id} plan={p} />)}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DiagnosticoPage() {
  const [month, setMonth] = useState(currentMonth)

  const summaryQ     = useMonthSummary(month)
  const debtsQ       = useDebts({ onlyActive: true })
  const plansQ       = useInstallmentPlans(true)
  const categoriesQ  = useCategories()

  const isLoading = summaryQ.isLoading || debtsQ.isLoading || plansQ.isLoading || categoriesQ.isLoading
  const isError   = summaryQ.isError   || debtsQ.isError   || plansQ.isError   || categoriesQ.isError

  const header = (
    <PageHeader
      title="Diagnóstico"
      extra={<MonthPicker value={month} onChange={setMonth} />}
    />
  )

  if (isLoading) return (
    <div className="space-y-6">
      {header}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
      </div>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  )

  if (isError) return (
    <div className="space-y-6">
      {header}
      <ErrorMessage onRetry={() => {
        summaryQ.refetch()
        debtsQ.refetch()
        plansQ.refetch()
        categoriesQ.refetch()
      }} />
    </div>
  )

  const summary    = summaryQ.data!
  const debts      = debtsQ.data ?? []
  const plans      = plansQ.data ?? []
  const categories = categoriesQ.data ?? []

  return (
    <div className="space-y-6">
      {header}

      <HealthIndicators summary={summary} />

      <IncomeCommitment summary={summary} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CategoryBreakdown summary={summary} categories={categories} />
        <PayoffProjections debts={debts} plans={plans} />
      </div>
    </div>
  )
}
