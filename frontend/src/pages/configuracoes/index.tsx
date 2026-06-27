import { useState } from 'react'
import { Plus, Pencil, Trash2, Lock, LayoutGrid } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { CategoryIcon } from '@/components/category-icon'
import { CategoryForm } from './category-form'
import { useCategories, useDeleteCategory } from '@/hooks/use-categories'
import { SkeletonCard } from '@/components/loading-skeleton'
import { ErrorMessage } from '@/components/error-message'
import { EmptyState } from '@/components/empty-state'
import type { Category } from '@/types/api'

export default function ConfiguracoesPage() {
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<Category | undefined>()
  const [deleting, setDeleting]   = useState<Category | undefined>()

  const { data: categories, isLoading, isError, refetch } = useCategories()
  const deleteMut = useDeleteCategory()

  const system = (categories ?? []).filter(c => c.is_system)
  const custom  = (categories ?? []).filter(c => !c.is_system)

  const handleDelete = async () => {
    if (!deleting) return
    await deleteMut.mutateAsync(deleting.id)
    setDeleting(undefined)
  }

  if (isLoading) return (
    <div className="space-y-6">
      <PageHeader title="Configurações" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )

  if (isError) return (
    <div className="space-y-6">
      <PageHeader title="Configurações" />
      <ErrorMessage onRetry={refetch} />
    </div>
  )

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configurações"
        action={
          <Button size="sm" onClick={() => { setEditing(undefined); setShowForm(true) }}>
            <Plus className="h-4 w-4" /> Nova categoria
          </Button>
        }
      />

      {/* System categories */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Categorias do sistema
          </h2>
          <Badge variant="muted" className="text-[10px]">{system.length}</Badge>
        </div>

        {system.length === 0 ? (
          <p className="text-sm text-text-muted">Nenhuma categoria do sistema.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {system.map(cat => (
              <CategoryCard key={cat.id} category={cat} system />
            ))}
          </div>
        )}
      </section>

      {/* Custom categories */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted">
            Categorias personalizadas
          </h2>
          <Badge variant="muted" className="text-[10px]">{custom.length}</Badge>
        </div>

        {custom.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title="Nenhuma categoria personalizada"
            description="Crie categorias para organizar seus gastos da forma que faz sentido para você."
            action={{ label: 'Criar categoria', onClick: () => setShowForm(true) }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {custom.map(cat => (
              <CategoryCard
                key={cat.id}
                category={cat}
                onEdit={() => { setEditing(cat); setShowForm(true) }}
                onDelete={() => setDeleting(cat)}
              />
            ))}
          </div>
        )}
      </section>

      <CategoryForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(undefined) }}
        editing={editing}
      />

      <AlertDialog
        open={!!deleting}
        title="Excluir categoria"
        description={`Deseja excluir "${deleting?.name}"? Esta ação não pode ser desfeita. Os gastos vinculados serão mantidos.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(undefined)}
        loading={deleteMut.isPending}
      />
    </div>
  )
}

function CategoryCard({ category, system, onEdit, onDelete }: {
  category: Category
  system?:  boolean
  onEdit?:  () => void
  onDelete?: () => void
}) {
  return (
    <div className="group relative rounded-xl border border-border bg-ground-surface p-4 transition-colors hover:border-border/70">
      <div className="flex items-start justify-between mb-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: category.color + '22', color: category.color }}
        >
          <CategoryIcon iconName={category.icon} className="h-5 w-5" />
        </span>

        {system ? (
          <Lock className="h-3.5 w-3.5 text-text-muted shrink-0 mt-0.5" />
        ) : (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="p-1 rounded text-text-muted hover:text-text hover:bg-ground-raised transition-colors"
              title="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1 rounded text-text-muted hover:text-negative hover:bg-ground-raised transition-colors"
              title="Excluir"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <p className="text-sm font-medium text-text-strong leading-tight">{category.name}</p>
      {system && (
        <p className="text-[11px] text-text-muted mt-0.5">Sistema</p>
      )}

      {/* Color accent strip */}
      <div
        className="absolute bottom-0 left-4 right-4 h-px rounded-full opacity-50"
        style={{ backgroundColor: category.color }}
      />
    </div>
  )
}
