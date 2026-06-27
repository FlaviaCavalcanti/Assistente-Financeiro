import { TrendingUp, TrendingDown, Wallet, CreditCard } from 'lucide-react'
import { MoneyDisplay } from '@/components/money-display'
import type { Summary } from '@/types/api'

interface CardProps {
  label:         string
  cents:         number
  subtitle:      string
  icon:          typeof TrendingUp
  forcePositive?: boolean
  forceNegative?: boolean
}

function Card({ label, cents, subtitle, icon: Icon, forcePositive, forceNegative }: CardProps) {
  return (
    <div className="rounded-xl border border-border bg-ground-surface p-5 space-y-2 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</span>
        <Icon className="h-4 w-4 text-text-muted" />
      </div>
      <MoneyDisplay
        cents={Math.abs(cents)}
        showSign={false}
        forcePositive={forcePositive}
        forceNegative={forceNegative}
        colorize={!forcePositive && !forceNegative}
        size="xl"
      />
      <p className="text-xs text-text-muted">{subtitle}</p>
    </div>
  )
}

export function SummaryCards({ summary }: { summary: Summary }) {
  const committed = summary.debt_commitment_cents + summary.installment_commitment_cents
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card
        label="Saldo do Mês"
        cents={summary.balance_cents}
        subtitle="renda − comprometido"
        icon={Wallet}
      />
      <Card
        label="Renda Total"
        cents={summary.income_total_cents}
        subtitle="no mês"
        icon={TrendingUp}
        forcePositive
      />
      <Card
        label="Total de Gastos"
        cents={summary.expense_total_cents}
        subtitle="fixos + variáveis"
        icon={TrendingDown}
        forceNegative
      />
      <Card
        label="Comprometido"
        cents={committed}
        subtitle="dívidas + parcelas"
        icon={CreditCard}
        forceNegative
      />
    </div>
  )
}
