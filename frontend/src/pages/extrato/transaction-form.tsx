import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useCreateTransaction, useUpdateTransaction } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { floatToCents, centsToFloat } from '@/lib/format'
import type { Transaction } from '@/types/api'

const schema = z.object({
  date:        z.string().min(1, 'Data obrigatória'),
  description: z.string().min(1, 'Descrição obrigatória'),
  amount_brl:  z.coerce.number().positive('Valor deve ser maior que zero'),
  direction:   z.enum(['credit', 'debit']),
  category_id: z.string().optional(),
  note:        z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface TransactionFormProps {
  open:       boolean
  onClose:    () => void
  editing?:   Transaction
}

export function TransactionForm({ open, onClose, editing }: TransactionFormProps) {
  const { data: categories } = useCategories()
  const createMut = useCreateTransaction()
  const updateMut = useUpdateTransaction()

  const form = useForm<FormData>({
    resolver: zodResolver(schema as any) as Resolver<FormData>,
    defaultValues: editing ? {
      date:        editing.date,
      description: editing.description,
      amount_brl:  centsToFloat(editing.amount_cents),
      direction:   editing.direction,
      category_id: editing.category_id || '',
      note:        editing.note || '',
    } : {
      date:      new Date().toISOString().split('T')[0],
      direction: 'debit',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(editing ? {
        date:        editing.date,
        description: editing.description,
        amount_brl:  centsToFloat(editing.amount_cents),
        direction:   editing.direction,
        category_id: editing.category_id || '',
        note:        editing.note || '',
      } : {
        date:      new Date().toISOString().split('T')[0],
        direction: 'debit',
      })
    }
  }, [open, editing])

  const onSubmit = form.handleSubmit(async (data) => {
    const payload = {
      date:         data.date,
      description:  data.description,
      amount_cents: floatToCents(data.amount_brl),
      direction:    data.direction,
      category_id:  data.category_id || undefined,
      note:         data.note || undefined,
    }
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, data: payload })
    } else {
      await createMut.mutateAsync(payload)
    }
    onClose()
  })

  const isPending = createMut.isPending || updateMut.isPending
  const errors = form.formState.errors

  return (
    <Dialog open={open} onClose={onClose} title={editing ? 'Editar lançamento' : 'Novo lançamento'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="date">Data *</Label>
            <Input id="date" type="date" {...form.register('date')} error={!!errors.date} />
            {errors.date && <p className="text-xs text-negative">{errors.date.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="direction">Direção *</Label>
            <Select id="direction" {...form.register('direction')}>
              <option value="debit">Débito (saída)</option>
              <option value="credit">Crédito (entrada)</option>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Descrição *</Label>
          <Input id="description" placeholder="Ex: Supermercado" {...form.register('description')} error={!!errors.description} />
          {errors.description && <p className="text-xs text-negative">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="amount_brl">Valor (R$) *</Label>
            <Input id="amount_brl" type="number" step="0.01" placeholder="0,00" {...form.register('amount_brl')} error={!!errors.amount_brl} />
            {errors.amount_brl && <p className="text-xs text-negative">{errors.amount_brl.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category_id">Categoria</Label>
            <Select id="category_id" {...form.register('category_id')}>
              <option value="">— Nenhuma —</option>
              {(categories ?? []).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="note">Observação</Label>
          <Input id="note" placeholder="Opcional" {...form.register('note')} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isPending}>
            {editing ? 'Salvar' : 'Criar lançamento'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
