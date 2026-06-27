import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useCreateInstallmentPlan } from '@/hooks/use-installment-plans'
import { useDebts } from '@/hooks/use-debts'
import { useCategories } from '@/hooks/use-categories'
import { floatToCents } from '@/lib/format'

const schema = z.object({
  description:              z.string().min(1, 'Descrição obrigatória'),
  debt_id:                  z.string().min(1, 'Dívida obrigatória'),
  category_id:              z.string().min(1, 'Categoria obrigatória'),
  total_brl:                z.coerce.number().positive('Valor total obrigatório'),
  installment_amount_brl:   z.coerce.number().positive('Valor da parcela obrigatório'),
  total_installments:       z.coerce.number().min(1),
  first_due_date:           z.string().min(1, 'Data obrigatória'),
})
type FormData = z.infer<typeof schema>

interface InstallmentFormProps {
  open:    boolean
  onClose: () => void
}

export function InstallmentForm({ open, onClose }: InstallmentFormProps) {
  const { data: debts }      = useDebts({ onlyActive: true })
  const { data: categories } = useCategories()
  const createMut            = useCreateInstallmentPlan()

  const form = useForm<FormData>({ resolver: zodResolver(schema as any) as Resolver<FormData> })

  useEffect(() => {
    if (!open) form.reset()
  }, [open])

  const onSubmit = form.handleSubmit(async (data) => {
    await createMut.mutateAsync({
      description:              data.description,
      debt_id:                  data.debt_id,
      category_id:              data.category_id,
      total_cents:              floatToCents(data.total_brl),
      installment_amount_cents: floatToCents(data.installment_amount_brl),
      total_installments:       data.total_installments,
      first_due_date:           data.first_due_date,
    })
    onClose()
  })

  const errors = form.formState.errors

  return (
    <Dialog open={open} onClose={onClose} title="Novo parcelamento">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Descrição *</Label>
          <Input placeholder="Ex: iPhone 15" {...form.register('description')} error={!!errors.description} />
          {errors.description && <p className="text-xs text-negative">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Dívida (cartão) *</Label>
            <Select {...form.register('debt_id')} error={!!errors.debt_id}>
              <option value="">— Selecione —</option>
              {(debts ?? []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Categoria *</Label>
            <Select {...form.register('category_id')} error={!!errors.category_id}>
              <option value="">— Selecione —</option>
              {(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Valor total (R$) *</Label>
            <Input type="number" step="0.01" {...form.register('total_brl')} />
          </div>
          <div className="space-y-1.5">
            <Label>Valor da parcela (R$) *</Label>
            <Input type="number" step="0.01" {...form.register('installment_amount_brl')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Número de parcelas *</Label>
            <Input type="number" min={1} {...form.register('total_installments')} />
          </div>
          <div className="space-y-1.5">
            <Label>1ª parcela *</Label>
            <Input type="date" {...form.register('first_due_date')} error={!!errors.first_due_date} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={createMut.isPending}>Adicionar parcelamento</Button>
        </div>
      </form>
    </Dialog>
  )
}
