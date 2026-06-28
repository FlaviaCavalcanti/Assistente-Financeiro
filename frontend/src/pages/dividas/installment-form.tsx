import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useCreateInstallmentPlan, useUpdateInstallmentPlan } from '@/hooks/use-installment-plans'
import { useDebts } from '@/hooks/use-debts'
import { useCategories } from '@/hooks/use-categories'
import { floatToCents, centsToFloat } from '@/lib/format'
import type { InstallmentPlan } from '@/types/api'

const schema = z.object({
  description:            z.string().min(1, 'Descrição obrigatória'),
  debt_id:                z.string().optional(),
  category_id:            z.string().min(1, 'Categoria obrigatória'),
  installment_amount_brl: z.coerce.number().positive('Valor da parcela obrigatório'),
  total_installments:     z.coerce.number().int().min(1, 'Mínimo 1 parcela'),
  paid_installments:      z.coerce.number().int().min(0).default(0),
  first_due_date:         z.string().min(1, 'Próximo vencimento obrigatório'),
}).refine(d => d.paid_installments < d.total_installments, {
  message: 'Já pagas deve ser menor que o total de parcelas',
  path: ['paid_installments'],
})

type FormData = z.infer<typeof schema>

interface InstallmentFormProps {
  open:      boolean
  onClose:   () => void
  editing?:  InstallmentPlan
}

export function InstallmentForm({ open, onClose, editing }: InstallmentFormProps) {
  const { data: debts }      = useDebts({ onlyActive: true })
  const { data: categories } = useCategories()
  const createMut            = useCreateInstallmentPlan()
  const updateMut            = useUpdateInstallmentPlan()
  const [apiError, setApiError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const form = useForm<FormData>({
    resolver: zodResolver(schema as any) as Resolver<FormData>,
    defaultValues: { paid_installments: 0, first_due_date: today },
  })

  useEffect(() => {
    if (open) {
      setApiError(null)
      if (editing) {
        form.reset({
          description:            editing.description,
          debt_id:                editing.debt_id || '',
          category_id:            editing.category_id,
          installment_amount_brl: centsToFloat(editing.installment_amount_cents),
          total_installments:     editing.total_installments,
          paid_installments:      editing.paid_installments,
          first_due_date:         editing.first_due_date
            ? String(editing.first_due_date).slice(0, 10)
            : today,
        })
      } else {
        form.reset({ paid_installments: 0, first_due_date: today })
      }
    }
  }, [open, editing])

  const totalInstallments = form.watch('total_installments') ?? 0
  const paidInstallments  = form.watch('paid_installments')  ?? 0
  const remaining         = Math.max(0, Number(totalInstallments) - Number(paidInstallments))

  const onSubmit = form.handleSubmit(async (data) => {
    setApiError(null)
    try {
      const installmentCents = floatToCents(data.installment_amount_brl)
      if (editing) {
        await updateMut.mutateAsync({
          id: editing.id,
          data: {
            description:              data.description,
            debt_id:                  data.debt_id || undefined,
            category_id:              data.category_id,
            installment_amount_cents: installmentCents,
            total_installments:       data.total_installments,
            paid_installments:        data.paid_installments,
            first_due_date:           data.first_due_date,
          },
        })
      } else {
        await createMut.mutateAsync({
          description:              data.description,
          debt_id:                  data.debt_id || undefined,
          category_id:              data.category_id,
          total_cents:              installmentCents * data.total_installments,
          installment_amount_cents: installmentCents,
          total_installments:       data.total_installments,
          paid_installments:        data.paid_installments,
          first_due_date:           data.first_due_date,
        })
      }
      onClose()
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Erro ao salvar parcelamento.')
    }
  })

  const isPending = editing ? updateMut.isPending : createMut.isPending
  const errors    = form.formState.errors

  return (
    <Dialog open={open} onClose={onClose} title={editing ? 'Editar parcelamento' : 'Novo parcelamento'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Descrição *</Label>
          <Input placeholder="Ex: iPhone 15, Carnê da Riachuelo" {...form.register('description')} error={!!errors.description} />
          {errors.description && <p className="text-xs text-negative">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Cartão (opcional)</Label>
            <Select {...form.register('debt_id')}>
              <option value="">— Sem cartão —</option>
              {(debts ?? []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            <p className="text-xs text-text-muted">Carnê, compra parcelada com pessoa, etc.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Categoria *</Label>
            <Select {...form.register('category_id')} error={!!errors.category_id}>
              <option value="">— Selecione —</option>
              {(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            {errors.category_id && <p className="text-xs text-negative">{errors.category_id.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Valor da parcela (R$) *</Label>
            <Input type="number" step="0.01" placeholder="0,00" {...form.register('installment_amount_brl')} error={!!errors.installment_amount_brl} />
            {errors.installment_amount_brl && <p className="text-xs text-negative">{errors.installment_amount_brl.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Total de parcelas *</Label>
            <Input type="number" min={1} placeholder="Ex: 12" {...form.register('total_installments')} error={!!errors.total_installments} />
            {errors.total_installments && <p className="text-xs text-negative">{errors.total_installments.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Já paguei</Label>
            <Input type="number" min={0} placeholder="0" {...form.register('paid_installments')} error={!!errors.paid_installments} />
            {errors.paid_installments
              ? <p className="text-xs text-negative">{errors.paid_installments.message}</p>
              : remaining > 0 && <p className="text-xs text-text-muted">Faltam {remaining} parcela{remaining !== 1 ? 's' : ''}</p>
            }
          </div>
          <div className="space-y-1.5">
            <Label>Próximo vencimento *</Label>
            <Input type="date" {...form.register('first_due_date')} error={!!errors.first_due_date} />
            {errors.first_due_date && <p className="text-xs text-negative">{errors.first_due_date.message}</p>}
          </div>
        </div>

        {apiError && (
          <p className="text-xs text-negative bg-negative/10 border border-negative/20 rounded px-3 py-2">
            {apiError}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isPending}>
            {editing ? 'Salvar alterações' : 'Adicionar parcelamento'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
