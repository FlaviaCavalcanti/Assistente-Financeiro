import { useState } from 'react'
import { Plus, Pencil, CheckCircle2, CreditCard, Landmark } from 'lucide-react'
import { addMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { MoneyDisplay } from '@/components/money-display'
import { CategoryBadge } from '@/components/category-badge'
import { DebtForm } from './debt-form'
import { InstallmentForm } from './installment-form'
import { useDebts, useDeactivateDebt } from '@/hooks/use-debts'
import { useInstallmentPlans, usePayInstallment, useDeactivateInstallmentPlan } from '@/hooks/use-installment-plans'
import { useCategories } from '@/hooks/use-categories'
import { formatMoney } from '@/lib/format'
import { SkeletonCard } from '@/components/loading-skeleton'
import { ErrorMessage } from '@/components/error-message'
import { EmptyState } from '@/components/empty-state'
import type { Debt, InstallmentPlan, Category } from '@/types/api'

export default function DividasPage() {
  const [showDebtForm, setShowDebtForm]             = useState(false)
  const [showInstallForm, setShowInstallForm]       = useState(false)
  const [editingDebt, setEditingDebt]               = useState<Debt | undefined>()
  const [deletingDebt, setDeletingDebt]             = useState<Debt | undefined>()
  const [deletingInstall, setDeletingInstall]       = useState<InstallmentPlan | undefined>()
  const [payingId, setPayingId]                     = useState<string | null>(null)

  const { data: debts,        isLoading, isError, refetch } = useDebts({ onlyActive: true })
  const { data: installments }  = useInstallmentPlans(true)
  const { data: categories }    = useCategories()
  const deactivateDebt          = useDeactivateDebt()
  const payInstall              = usePayInstallment()
  const deactivateInstall       = useDeactivateInstallmentPlan()

  const catMap = Object.fromEntries((categories ?? []).map(c => [c.id, c]))

  const handleDeactivateDebt = async () => {
    if (!deletingDebt) return
    await deactivateDebt.mutateAsync(deletingDebt.id)
    setDeletingDebt(undefined)
  }

  const handleDeactivateInstall = async () => {
    if (!deletingInstall) return
    await deactivateInstall.mutateAsync(deletingInstall.id)
    setDeletingInstall(undefined)
  }
  const cards    = (debts ?? []).filter(d => d.kind === 'credit_card')
  const loans    = (debts ?? []).filter(d => d.kind === 'loan')

  if (isLoading) return (
    <div className="space-y-6">
      <PageHeader title="Dívidas" />
      <div className="grid grid-cols-1 gap-3">
        {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )

  if (isError) return (
    <div className="space-y-6">
      <PageHeader title="Dívidas" />
      <ErrorMessage onRetry={refetch} />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dívidas"
        action={
          <Button size="sm" onClick={() => { setEditingDebt(undefined); setShowDebtForm(true) }}>
            <Plus className="h-4 w-4" /> Nova dívida
          </Button>
        }
      />

      <Tabs defaultValue="cards">
        <TabsList>
          <TabsTrigger value="cards">Cartões ({cards.length})</TabsTrigger>
          <TabsTrigger value="loans">Empréstimos ({loans.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="mt-4">
          {cards.length === 0 ? (
            <EmptyState icon={CreditCard} title="Nenhum cartão cadastrado"
              action={{ label: 'Adicionar cartão', onClick: () => setShowDebtForm(true) }} />
          ) : (
            <div className="space-y-3">
              {cards.map(d => <CreditCardDebtCard key={d.id} debt={d}
                onEdit={() => { setEditingDebt(d); setShowDebtForm(true) }}
                onDeactivate={() => setDeletingDebt(d)} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="loans" className="mt-4">
          {loans.length === 0 ? (
            <EmptyState icon={Landmark} title="Nenhum empréstimo cadastrado"
              action={{ label: 'Adicionar empréstimo', onClick: () => setShowDebtForm(true) }} />
          ) : (
            <div className="space-y-3">
              {loans.map(d => <LoanDebtCard key={d.id} debt={d}
                onEdit={() => { setEditingDebt(d); setShowDebtForm(true) }}
                onDeactivate={() => setDeletingDebt(d)} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Parcelamentos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Parcelamentos Ativos
          </h2>
          <Button variant="outline" size="sm" onClick={() => setShowInstallForm(true)}>
            <Plus className="h-3.5 w-3.5" /> Novo parcelamento
          </Button>
        </div>

        {!(installments ?? []).length ? (
          <EmptyState title="Nenhum parcelamento ativo" description="Adicione compras parceladas para acompanhar aqui." />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(installments ?? []).map(plan => (
              <InstallmentCard
                key={plan.id}
                plan={plan}
                category={catMap[plan.category_id]}
                onPay={() => {
                  setPayingId(plan.id)
                  payInstall.mutate(plan.id, { onSettled: () => setPayingId(null) })
                }}
                onDeactivate={() => setDeletingInstall(plan)}
                paying={payingId === plan.id && payInstall.isPending}
              />
            ))}
          </div>
        )}
      </div>

      <DebtForm
        open={showDebtForm}
        onClose={() => { setShowDebtForm(false); setEditingDebt(undefined) }}
        editing={editingDebt}
      />
      <InstallmentForm open={showInstallForm} onClose={() => setShowInstallForm(false)} />

      <AlertDialog
        open={!!deletingDebt}
        title="Remover dívida"
        description={`Deseja remover "${deletingDebt?.name}"?`}
        onConfirm={handleDeactivateDebt}
        onCancel={() => setDeletingDebt(undefined)}
        loading={deactivateDebt.isPending}
      />
      <AlertDialog
        open={!!deletingInstall}
        title="Remover parcelamento"
        description={`Deseja remover "${deletingInstall?.description}"?`}
        onConfirm={handleDeactivateInstall}
        onCancel={() => setDeletingInstall(undefined)}
        loading={deactivateInstall.isPending}
      />
    </div>
  )
}

function CreditCardDebtCard({ debt, onEdit, onDeactivate }: { debt: Debt; onEdit: () => void; onDeactivate: () => void }) {
  const usedPct = debt.limit_cents > 0 ? (debt.current_balance_cents / debt.limit_cents) * 100 : 0
  const barColor = usedPct > 80 ? 'bg-negative' : usedPct > 50 ? 'bg-warning' : 'bg-positive'

  return (
    <div className="rounded-xl border border-border bg-ground-surface p-5 shadow-card space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-brand" />
          <span className="font-medium text-text-strong">{debt.name}</span>
        </div>
        <Badge variant="default">Cartão</Badge>
      </div>

      <div>
        <div className="flex justify-between text-xs text-text-muted mb-1.5">
          <span>Utilizado: {formatMoney(debt.current_balance_cents)}</span>
          <span>Limite: {formatMoney(debt.limit_cents)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(usedPct, 100)}%` }} />
        </div>
        <p className="text-xs text-text-muted mt-1">{usedPct.toFixed(0)}% utilizado</p>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div>
          <p className="text-xs text-text-muted">Mínimo</p>
          <MoneyDisplay cents={debt.minimum_payment_cents} forceNegative size="sm" />
        </div>
        <div>
          <p className="text-xs text-text-muted">Fecha dia</p>
          <p className="tabular text-text">{debt.closing_day}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Vence dia</p>
          <p className="tabular text-text">{debt.due_day}</p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1 border-t border-border/50">
        <Button variant="ghost" size="sm" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
        <Button variant="ghost" size="sm" onClick={onDeactivate} className="text-text-muted hover:text-negative">Remover</Button>
      </div>
    </div>
  )
}

function LoanDebtCard({ debt, onEdit, onDeactivate }: { debt: Debt; onEdit: () => void; onDeactivate: () => void }) {
  const paidPct = debt.total_installments > 0 ? (debt.paid_installments / debt.total_installments) * 100 : 0
  const remaining = debt.total_installments - debt.paid_installments
  const payoffDate = remaining > 0
    ? format(addMonths(new Date(), remaining), 'MMM yyyy', { locale: ptBR })
    : 'Quitado'

  return (
    <div className="rounded-xl border border-border bg-ground-surface p-5 shadow-card space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-brand" />
          <span className="font-medium text-text-strong">{debt.name}</span>
        </div>
        <Badge variant="muted">Empréstimo</Badge>
      </div>

      <div>
        <div className="flex justify-between text-xs text-text-muted mb-1.5">
          <span>{debt.paid_installments}/{debt.total_installments} parcelas</span>
          <span>Previsão: {payoffDate}</span>
        </div>
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${paidPct}%` }} />
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div>
          <p className="text-xs text-text-muted">Restante</p>
          <MoneyDisplay cents={debt.remaining_balance_cents} forceNegative size="sm" />
        </div>
        <div>
          <p className="text-xs text-text-muted">Parcela</p>
          <MoneyDisplay cents={debt.monthly_payment_cents} forceNegative size="sm" />
        </div>
        <div>
          <p className="text-xs text-text-muted">Vence dia</p>
          <p className="tabular text-text">{debt.due_day}</p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1 border-t border-border/50">
        <Button variant="ghost" size="sm" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
        <Button variant="ghost" size="sm" onClick={onDeactivate} className="text-text-muted hover:text-negative">Remover</Button>
      </div>
    </div>
  )
}

function InstallmentCard({ plan, category, onPay, onDeactivate, paying }: {
  plan:         InstallmentPlan
  category?:    Category
  onPay:        () => void
  onDeactivate: () => void
  paying:       boolean
}) {
  const paidPct = (plan.paid_installments / plan.total_installments) * 100

  return (
    <div className="rounded-xl border border-border bg-ground-surface p-5 shadow-card space-y-3">
      <div className="flex items-start justify-between">
        <span className="font-medium text-text-strong">{plan.description}</span>
        {category && <CategoryBadge category={category} showIcon={false} />}
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div>
          <p className="text-xs text-text-muted">Parcela</p>
          <MoneyDisplay cents={plan.installment_amount_cents} forceNegative size="sm" />
        </div>
        <div>
          <p className="text-xs text-text-muted">Progresso</p>
          <p className="tabular text-text">{plan.paid_installments}/{plan.total_installments}</p>
        </div>
      </div>

      <div className="h-1 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full bg-positive transition-all" style={{ width: `${paidPct}%` }} />
      </div>

      <div className="flex justify-end gap-2 pt-1 border-t border-border/50">
        <Button variant="ghost" size="sm" onClick={onDeactivate} className="text-text-muted hover:text-negative">Remover</Button>
        <Button variant="secondary" size="sm" onClick={onPay} loading={paying}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Pagar próxima
        </Button>
      </div>
    </div>
  )
}
