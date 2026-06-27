import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useCreateDebt, useUpdateDebt } from '@/hooks/use-debts'
import { floatToCents, centsToFloat } from '@/lib/format'
import type { Debt } from '@/types/api'

const cardSchema = z.object({
  kind:                  z.literal('credit_card'),
  name:                  z.string().min(1),
  limit_brl:             z.coerce.number().positive('Limite obrigatório'),
  current_balance_brl:   z.coerce.number().min(0).optional(),
  minimum_payment_brl:   z.coerce.number().min(0).optional(),
  closing_day:           z.coerce.number().min(1).max(31),
  due_day:               z.coerce.number().min(1).max(31),
  interest_rate_pct:     z.coerce.number().min(0).optional(),
})

const loanSchema = z.object({
  kind:                  z.literal('loan'),
  name:                  z.string().min(1),
  principal_brl:         z.coerce.number().positive('Principal obrigatório'),
  remaining_balance_brl: z.coerce.number().min(0).optional(),
  monthly_payment_brl:   z.coerce.number().positive('Parcela obrigatória'),
  total_installments:    z.coerce.number().min(1),
  paid_installments:     z.coerce.number().min(0).optional(),
  due_day:               z.coerce.number().min(1).max(31),
  interest_rate_pct:     z.coerce.number().min(0).optional(),
})

const schema = z.discriminatedUnion('kind', [cardSchema, loanSchema])
type FormData = z.infer<typeof schema>

interface DebtFormProps {
  open:     boolean
  onClose:  () => void
  editing?: Debt
}

export function DebtForm({ open, onClose, editing }: DebtFormProps) {
  const createMut = useCreateDebt()
  const updateMut = useUpdateDebt()

  const form = useForm<FormData>({
    resolver: zodResolver(schema as any) as Resolver<FormData>,
    defaultValues: editing
      ? editing.kind === 'credit_card'
        ? {
            kind:                'credit_card',
            name:                editing.name,
            limit_brl:           centsToFloat(editing.limit_cents),
            current_balance_brl: centsToFloat(editing.current_balance_cents),
            minimum_payment_brl: centsToFloat(editing.minimum_payment_cents),
            closing_day:         editing.closing_day,
            due_day:             editing.due_day,
            interest_rate_pct:   editing.interest_rate_bps / 100,
          }
        : {
            kind:                  'loan',
            name:                  editing.name,
            principal_brl:         centsToFloat(editing.principal_cents),
            remaining_balance_brl: centsToFloat(editing.remaining_balance_cents),
            monthly_payment_brl:   centsToFloat(editing.monthly_payment_cents),
            total_installments:    editing.total_installments,
            paid_installments:     editing.paid_installments,
            due_day:               editing.due_day,
            interest_rate_pct:     editing.interest_rate_bps / 100,
          }
      : { kind: 'credit_card' },
  })

  useEffect(() => {
    if (!open) { form.reset(); return }
    if (!editing) { form.reset({ kind: 'credit_card' }); return }
    if (editing.kind === 'credit_card') {
      form.reset({
        kind:                'credit_card',
        name:                editing.name,
        limit_brl:           centsToFloat(editing.limit_cents),
        current_balance_brl: centsToFloat(editing.current_balance_cents),
        minimum_payment_brl: centsToFloat(editing.minimum_payment_cents),
        closing_day:         editing.closing_day,
        due_day:             editing.due_day,
        interest_rate_pct:   editing.interest_rate_bps / 100,
      })
    } else {
      form.reset({
        kind:                  'loan',
        name:                  editing.name,
        principal_brl:         centsToFloat(editing.principal_cents),
        remaining_balance_brl: centsToFloat(editing.remaining_balance_cents),
        monthly_payment_brl:   centsToFloat(editing.monthly_payment_cents),
        total_installments:    editing.total_installments,
        paid_installments:     editing.paid_installments,
        due_day:               editing.due_day,
        interest_rate_pct:     editing.interest_rate_bps / 100,
      })
    }
  }, [open, editing])

  const kind = form.watch('kind')

  const onSubmit = form.handleSubmit(async (data) => {
    let payload: Partial<Debt>
    if (data.kind === 'credit_card') {
      payload = {
        kind:                  'credit_card',
        name:                  data.name,
        limit_cents:           floatToCents(data.limit_brl),
        current_balance_cents: floatToCents(data.current_balance_brl ?? 0),
        minimum_payment_cents: floatToCents(data.minimum_payment_brl ?? 0),
        closing_day:           data.closing_day,
        due_day:               data.due_day,
        interest_rate_bps:     Math.round((data.interest_rate_pct ?? 0) * 100),
      }
    } else {
      payload = {
        kind:                    'loan',
        name:                    data.name,
        principal_cents:         floatToCents(data.principal_brl),
        remaining_balance_cents: floatToCents(data.remaining_balance_brl ?? data.principal_brl),
        monthly_payment_cents:   floatToCents(data.monthly_payment_brl),
        total_installments:      data.total_installments,
        paid_installments:       data.paid_installments ?? 0,
        due_day:                 data.due_day,
        interest_rate_bps:       Math.round((data.interest_rate_pct ?? 0) * 100),
      }
    }
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, data: payload })
    } else {
      await createMut.mutateAsync(payload)
    }
    onClose()
  })

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <Dialog open={open} onClose={onClose} title={editing ? 'Editar dívida' : 'Nova dívida'} className="max-w-xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Tipo *</Label>
          <Select {...form.register('kind')}>
            <option value="credit_card">Cartão de Crédito</option>
            <option value="loan">Empréstimo</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Nome *</Label>
          <Input placeholder={kind === 'credit_card' ? 'Ex: Nubank' : 'Ex: Empréstimo Pessoal'} {...form.register('name')} />
        </div>

        {kind === 'credit_card' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Limite (R$) *</Label>
                <Input type="number" step="0.01" {...form.register('limit_brl')} />
              </div>
              <div className="space-y-1.5">
                <Label>Saldo atual (R$)</Label>
                <Input type="number" step="0.01" placeholder="0,00" {...form.register('current_balance_brl')} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Mínimo (R$)</Label>
                <Input type="number" step="0.01" placeholder="0,00" {...form.register('minimum_payment_brl')} />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha dia *</Label>
                <Input type="number" min={1} max={31} {...form.register('closing_day')} />
              </div>
              <div className="space-y-1.5">
                <Label>Vence dia *</Label>
                <Input type="number" min={1} max={31} {...form.register('due_day')} />
              </div>
            </div>
          </>
        )}

        {kind === 'loan' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Principal (R$) *</Label>
                <Input type="number" step="0.01" {...form.register('principal_brl')} />
              </div>
              <div className="space-y-1.5">
                <Label>Saldo devedor (R$)</Label>
                <Input type="number" step="0.01" {...form.register('remaining_balance_brl')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Parcela mensal (R$) *</Label>
                <Input type="number" step="0.01" {...form.register('monthly_payment_brl')} />
              </div>
              <div className="space-y-1.5">
                <Label>Vence dia *</Label>
                <Input type="number" min={1} max={31} {...form.register('due_day')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Total de parcelas *</Label>
                <Input type="number" min={1} {...form.register('total_installments')} />
              </div>
              <div className="space-y-1.5">
                <Label>Parcelas pagas</Label>
                <Input type="number" min={0} placeholder="0" {...form.register('paid_installments')} />
              </div>
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <Label>Taxa de juros (% a.m.)</Label>
          <Input type="number" step="0.01" placeholder="0,00" {...form.register('interest_rate_pct')} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isPending}>{editing ? 'Salvar' : 'Adicionar'}</Button>
        </div>
      </form>
    </Dialog>
  )
}
