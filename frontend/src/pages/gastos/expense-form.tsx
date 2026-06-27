import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useCreateExpense, useUpdateExpense } from '@/hooks/use-expenses'
import { useCategories } from '@/hooks/use-categories'
import { floatToCents, centsToFloat } from '@/lib/format'
import type { Expense } from '@/types/api'

const schema = z.object({
  description:      z.string().min(1, 'Descrição obrigatória'),
  amount_brl:       z.coerce.number().positive('Valor obrigatório'),
  kind:             z.enum(['fixed', 'variable']),
  category_id:      z.string().min(1, 'Categoria obrigatória'),
  day_of_month:     z.coerce.number().min(0).max(31).optional(),
  transaction_date: z.string().optional(),
}).refine(d => d.kind !== 'fixed' || (d.day_of_month && d.day_of_month >= 1), {
  message: 'Dia de vencimento obrigatório para gasto fixo',
  path: ['day_of_month'],
})

type FormData = z.infer<typeof schema>

interface ExpenseFormProps {
  open:     boolean
  onClose:  () => void
  editing?: Expense
}

export function ExpenseForm({ open, onClose, editing }: ExpenseFormProps) {
  const { data: categories } = useCategories()
  const createMut = useCreateExpense()
  const updateMut = useUpdateExpense()
  const [apiError, setApiError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const form = useForm<FormData>({
    resolver: zodResolver(schema as any) as Resolver<FormData>,
    defaultValues: editing ? {
      description:      editing.description,
      amount_brl:       centsToFloat(editing.amount_cents),
      kind:             editing.kind,
      category_id:      editing.category_id,
      day_of_month:     editing.day_of_month || undefined,
      transaction_date: today,
    } : { kind: 'fixed', transaction_date: today },
  })

  useEffect(() => {
    if (open) {
      setApiError(null)
      form.reset(editing ? {
        description:      editing.description,
        amount_brl:       centsToFloat(editing.amount_cents),
        kind:             editing.kind,
        category_id:      editing.category_id,
        day_of_month:     editing.day_of_month || undefined,
        transaction_date: today,
      } : { kind: 'fixed', transaction_date: today })
    }
  }, [open, editing])

  const kind = form.watch('kind')

  const onSubmit = form.handleSubmit(async (data) => {
    setApiError(null)
    try {
      const payload = {
        description:      data.description,
        amount_cents:     floatToCents(data.amount_brl),
        kind:             data.kind,
        category_id:      data.category_id,
        recurrence:       data.kind === 'fixed' ? 'monthly' as const : 'none' as const,
        day_of_month:     data.kind === 'fixed' ? (data.day_of_month ?? 1) : 0,
        transaction_date: data.kind === 'variable' ? (data.transaction_date ?? '') : '',
      }
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, data: payload })
      } else {
        await createMut.mutateAsync(payload)
      }
      onClose()
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Erro ao salvar gasto.')
    }
  })

  const isPending = createMut.isPending || updateMut.isPending
  const errors = form.formState.errors

  return (
    <Dialog open={open} onClose={onClose} title={editing ? 'Editar gasto' : 'Novo gasto'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Descrição *</Label>
          <Input placeholder="Ex: Aluguel" {...form.register('description')} error={!!errors.description} />
          {errors.description && <p className="text-xs text-negative">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Valor (R$) *</Label>
            <Input type="number" step="0.01" placeholder="0,00" {...form.register('amount_brl')} error={!!errors.amount_brl} />
            {errors.amount_brl && <p className="text-xs text-negative">{errors.amount_brl.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Tipo *</Label>
            <Select {...form.register('kind')}>
              <option value="fixed">Fixo</option>
              <option value="variable">Variável</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Categoria *</Label>
            <Select {...form.register('category_id')} error={!!errors.category_id}>
              <option value="">— Selecione —</option>
              {(categories ?? []).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            {errors.category_id && <p className="text-xs text-negative">{errors.category_id.message}</p>}
          </div>
          {kind === 'fixed' && (
            <div className="space-y-1.5">
              <Label>Dia de vencimento *</Label>
              <Input type="number" min={1} max={31} placeholder="1–31" {...form.register('day_of_month')} error={!!errors.day_of_month} />
              {errors.day_of_month && <p className="text-xs text-negative">{errors.day_of_month.message}</p>}
            </div>
          )}
          {kind === 'variable' && (
            <div className="space-y-1.5">
              <Label>Data do gasto *</Label>
              <Input type="date" {...form.register('transaction_date')} />
            </div>
          )}
        </div>

        {apiError && (
          <p className="text-xs text-negative bg-negative/10 border border-negative/20 rounded px-3 py-2">
            {apiError}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isPending}>{editing ? 'Salvar' : 'Adicionar'}</Button>
        </div>
      </form>
    </Dialog>
  )
}
