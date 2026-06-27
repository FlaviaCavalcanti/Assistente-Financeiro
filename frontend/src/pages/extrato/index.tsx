import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { MoneyDisplay } from '@/components/money-display'
import { CategoryBadge } from '@/components/category-badge'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { TransactionForm } from './transaction-form'
import { useTransactions, useDeleteTransaction, type TransactionFilter } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { formatDate } from '@/lib/format'
import { SkeletonTable } from '@/components/loading-skeleton'
import { ErrorMessage } from '@/components/error-message'
import { EmptyState } from '@/components/empty-state'
import type { Transaction, Direction } from '@/types/api'

export default function ExtratoPage() {
  const [filter, setFilter]           = useState<TransactionFilter>({ page: 1, limit: 50 })
  const [showForm, setShowForm]       = useState(false)
  const [editing, setEditing]         = useState<Transaction | undefined>()
  const [deleting, setDeleting]       = useState<Transaction | undefined>()

  const { data, isLoading, isError, refetch } = useTransactions(filter)
  const { data: categories }                  = useCategories()
  const deleteMut                             = useDeleteTransaction()

  const catMap = Object.fromEntries((categories ?? []).map(c => [c.id, c]))
  const totalPages = data ? Math.ceil(data.pagination.total / data.pagination.limit) : 1

  const handleDelete = async () => {
    if (!deleting) return
    await deleteMut.mutateAsync(deleting.id)
    setDeleting(undefined)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Extrato"
        action={
          <Button size="sm" onClick={() => { setEditing(undefined); setShowForm(true) }}>
            <Plus className="h-4 w-4" /> Novo lançamento
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-ground-surface p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">De</span>
          <Input
            type="date"
            className="w-36"
            value={filter.from ?? ''}
            onChange={e => setFilter(f => ({ ...f, from: e.target.value || undefined, page: 1 }))}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Até</span>
          <Input
            type="date"
            className="w-36"
            value={filter.to ?? ''}
            onChange={e => setFilter(f => ({ ...f, to: e.target.value || undefined, page: 1 }))}
          />
        </div>
        <Select
          className="w-44"
          value={filter.category_id ?? ''}
          onChange={e => setFilter(f => ({ ...f, category_id: e.target.value || undefined, page: 1 }))}
        >
          <option value="">Todas as categorias</option>
          {(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select
          className="w-36"
          value={filter.direction ?? ''}
          onChange={e => { const v = e.target.value; setFilter(f => ({ ...f, direction: v ? (v as Direction) : undefined, page: 1 })) }}
        >
          <option value="">Todos</option>
          <option value="credit">Crédito</option>
          <option value="debit">Débito</option>
        </Select>
        {(filter.from || filter.to || filter.category_id || filter.direction) && (
          <Button variant="ghost" size="sm" onClick={() => setFilter({ page: 1, limit: 50 })}>
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-border bg-ground-surface overflow-hidden">
        {isLoading ? (
          <div className="p-4"><SkeletonTable rows={8} /></div>
        ) : isError ? (
          <ErrorMessage onRetry={refetch} />
        ) : !(data?.items ?? []).length ? (
          <EmptyState title="Nenhum lançamento encontrado" description="Tente ajustar os filtros." />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted">Categoria</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-text-muted">Valor</th>
                  <th className="px-4 py-3 w-16" />
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map(tx => {
                  const cat = catMap[tx.category_id]
                  return (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-ground-raised/50 group transition-colors">
                      <td className="px-4 py-3 tabular text-text-muted text-xs">
                        {formatDate(tx.date, 'dd/MM/yy')}
                      </td>
                      <td className="px-4 py-3 text-text max-w-xs truncate">{tx.description}</td>
                      <td className="px-4 py-3">
                        {cat ? <CategoryBadge category={cat} showIcon={false} /> : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MoneyDisplay
                          cents={tx.direction === 'debit' ? -tx.amount_cents : tx.amount_cents}
                          showSign
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditing(tx); setShowForm(true) }}
                            className="p-1 rounded text-text-muted hover:text-brand transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleting(tx)}
                            className="p-1 rounded text-text-muted hover:text-negative transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-text-muted">
                  {data?.pagination?.total ?? 0} lançamentos
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost" size="sm"
                    disabled={(filter.page ?? 1) <= 1}
                    onClick={() => setFilter(f => ({ ...f, page: (f.page ?? 1) - 1 }))}
                  >← Anterior</Button>
                  <span className="text-xs text-text-muted px-2">
                    {filter.page ?? 1} / {totalPages}
                  </span>
                  <Button
                    variant="ghost" size="sm"
                    disabled={(filter.page ?? 1) >= totalPages}
                    onClick={() => setFilter(f => ({ ...f, page: (f.page ?? 1) + 1 }))}
                  >Próximo →</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <TransactionForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(undefined) }}
        editing={editing}
      />

      <AlertDialog
        open={!!deleting}
        title="Remover lançamento"
        description={`Tem certeza que deseja remover "${deleting?.description}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(undefined)}
        loading={deleteMut.isPending}
      />
    </div>
  )
}
