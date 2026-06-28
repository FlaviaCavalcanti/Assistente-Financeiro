import { useState } from 'react'
import { Plus, Pencil, Calendar, ShoppingCart } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { MoneyDisplay } from '@/components/money-display'
import { CategoryBadge } from '@/components/category-badge'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { JuliusCard } from '@/components/julius-card'
import { ExpenseForm } from './expense-form'
import { useExpenses, useDeactivateExpense } from '@/hooks/use-expenses'
import { useCategories } from '@/hooks/use-categories'
import { SkeletonCard } from '@/components/loading-skeleton'
import { ErrorMessage } from '@/components/error-message'
import { EmptyState } from '@/components/empty-state'
import { getJuliusQuote } from '@/lib/julius'
import type { Expense, Category } from '@/types/api'

export default function GastosPage() {
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<Expense | undefined>()
  const [deleting, setDeleting]     = useState<Expense | undefined>()
  const [juliusQuote, setJuliusQuote] = useState<string | null>(null)

  const { data: allExpenses, isLoading, isError, refetch } = useExpenses({ onlyActive: true })
  const { data: categories } = useCategories()
  const deactivateMut = useDeactivateExpense()

  const catMap = Object.fromEntries((categories ?? []).map(c => [c.id, c]))
  const fixed    = (allExpenses ?? []).filter(e => e.kind === 'fixed')
  const variable = (allExpenses ?? []).filter(e => e.kind === 'variable')

  const handleDeactivate = async () => {
    if (!deleting) return
    await deactivateMut.mutateAsync(deleting.id)
    setDeleting(undefined)
  }

  if (isLoading) return (
    <div className="space-y-6">
      <PageHeader title="Gastos" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )

  if (isError) return (
    <div className="space-y-6">
      <PageHeader title="Gastos" />
      <ErrorMessage onRetry={refetch} />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gastos"
        action={
          <Button size="sm" onClick={() => { setEditing(undefined); setShowForm(true) }}>
            <Plus className="h-4 w-4" /> Novo gasto
          </Button>
        }
      />

      <Tabs defaultValue="fixed">
        <TabsList>
          <TabsTrigger value="fixed">Fixos ({fixed.length})</TabsTrigger>
          <TabsTrigger value="variable">Variáveis ({variable.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="fixed" className="mt-4">
          {fixed.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Nenhum gasto fixo cadastrado"
              action={{ label: 'Adicionar gasto fixo', onClick: () => setShowForm(true) }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {fixed.map(e => (
                <ExpenseCard
                  key={e.id}
                  expense={e}
                  category={catMap[e.category_id]}
                  onEdit={() => { setEditing(e); setShowForm(true) }}
                  onDeactivate={() => setDeleting(e)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="variable" className="mt-4">
          {variable.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Nenhum gasto variável cadastrado"
              action={{ label: 'Adicionar gasto variável', onClick: () => setShowForm(true) }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {variable.map(e => (
                <ExpenseCard
                  key={e.id}
                  expense={e}
                  category={catMap[e.category_id]}
                  onEdit={() => { setEditing(e); setShowForm(true) }}
                  onDeactivate={() => setDeleting(e)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {juliusQuote && (
        <JuliusCard
          quote={juliusQuote}
          variant="toast"
          onDismiss={() => setJuliusQuote(null)}
        />
      )}

      <ExpenseForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(undefined) }}
        editing={editing}
        onCreated={(kind) => {
          if (kind === 'variable') setJuliusQuote(getJuliusQuote('variable_expense'))
        }}
      />

      <AlertDialog
        open={!!deleting}
        title="Remover gasto"
        description={`Deseja remover "${deleting?.description}"? Os lançamentos existentes serão mantidos.`}
        confirmLabel="Remover"
        onConfirm={handleDeactivate}
        onCancel={() => setDeleting(undefined)}
        loading={deactivateMut.isPending}
      />
    </div>
  )
}

function ExpenseCard({ expense, category, onEdit, onDeactivate }: {
  expense:      Expense
  category?:    Category
  onEdit:       () => void
  onDeactivate: () => void
}) {
  return (
    <div className="rounded-xl border border-border bg-ground-surface p-5 shadow-card space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {expense.kind === 'fixed'
            ? <Calendar className="h-4 w-4 text-brand" />
            : <ShoppingCart className="h-4 w-4 text-warning" />
          }
          <span className="font-medium text-text-strong">{expense.description}</span>
        </div>
        <Badge variant={expense.kind === 'fixed' ? 'default' : 'warning'}>
          {expense.kind === 'fixed' ? 'Fixo' : 'Variável'}
        </Badge>
      </div>

      <div className="flex items-center gap-4">
        <div>
          <p className="text-xs text-text-muted mb-0.5">Valor</p>
          <MoneyDisplay cents={expense.amount_cents} forceNegative size="md" />
        </div>
        {category && (
          <div className="ml-auto">
            <CategoryBadge category={category} showIcon={false} />
          </div>
        )}
        {expense.kind === 'fixed' && expense.day_of_month > 0 && (
          <div className="text-right">
            <p className="text-xs text-text-muted mb-0.5">Vencimento</p>
            <p className="text-sm tabular text-text">Dia {expense.day_of_month}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
        <Button variant="ghost" size="sm" onClick={onDeactivate} className="text-text-muted hover:text-negative">
          Remover
        </Button>
      </div>
    </div>
  )
}
