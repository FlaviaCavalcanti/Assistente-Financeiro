import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useCreateIncomeSource, useUpdateIncomeSource } from '@/hooks/use-income-sources'
import { floatToCents, centsToFloat, currentMonth } from '@/lib/format'
import type { IncomeSource } from '@/types/api'

const schema = z.object({
  name:         z.string().min(1, 'Nome obrigatório'),
  kind:         z.enum(['recurring', 'one_time']),
  net_brl:      z.coerce.number().positive('Valor líquido obrigatório'),
  gross_brl:    z.coerce.number().min(0).optional(),
  recurrence:   z.enum(['monthly', 'weekly', 'biweekly', 'none']),
  day_of_month: z.coerce.number().min(1).max(31).optional(),
  first_month:  z.string().optional(),
  last_month:   z.string().optional(),
}).refine(d => d.kind !== 'recurring' || (d.day_of_month && d.day_of_month >= 1), {
  message: 'Dia obrigatório para renda recorrente',
  path: ['day_of_month'],
}).refine(d => d.kind !== 'one_time' || !!d.first_month, {
  message: 'Mês inicial obrigatório para renda avulsa',
  path: ['first_month'],
}).refine(d => !d.last_month || !d.first_month || d.last_month >= d.first_month, {
  message: 'Mês final deve ser igual ou posterior ao mês inicial',
  path: ['last_month'],
})

type FormData = z.infer<typeof schema>

interface IncomeFormProps {
  open:     boolean
  onClose:  () => void
  editing?: IncomeSource
}

export function IncomeForm({ open, onClose, editing }: IncomeFormProps) {
  const createMut = useCreateIncomeSource()
  const updateMut = useUpdateIncomeSource()

  const blankDefaults = { kind: 'recurring' as const, recurrence: 'monthly' as const, first_month: currentMonth() }
  const editingDefaults = editing ? {
    name:         editing.name,
    kind:         editing.kind,
    net_brl:      centsToFloat(editing.net_cents),
    gross_brl:    editing.gross_cents ? centsToFloat(editing.gross_cents) : undefined,
    recurrence:   editing.recurrence,
    day_of_month: editing.day_of_month,
    first_month:  editing.first_month || currentMonth(),
    last_month:   editing.last_month  || undefined,
  } : undefined

  const form = useForm<FormData>({
    resolver: zodResolver(schema as any) as Resolver<FormData>,
    defaultValues: editingDefaults ?? blankDefaults,
  })

  useEffect(() => {
    if (open) {
      form.reset(editingDefaults ?? blankDefaults)
    }
  }, [open, editing])

  const kind = form.watch('kind')

  const onSubmit = form.handleSubmit(async (data) => {
    const payload = {
      name:         data.name,
      kind:         data.kind,
      net_cents:    floatToCents(data.net_brl),
      gross_cents:  data.gross_brl ? floatToCents(data.gross_brl) : 0,
      recurrence:   data.kind === 'one_time' ? 'none' as const : data.recurrence,
      day_of_month: data.kind === 'recurring' ? (data.day_of_month ?? 1) : 0,
      first_month:  data.kind === 'one_time' ? (data.first_month ?? '') : '',
      last_month:   data.kind === 'one_time' ? (data.last_month  ?? '') : '',
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
    <Dialog open={open} onClose={onClose} title={editing ? 'Editar fonte de renda' : 'Nova fonte de renda'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Nome *</Label>
          <Input placeholder="Ex: Salário CLT" {...form.register('name')} error={!!errors.name} />
          {errors.name && <p className="text-xs text-negative">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Tipo *</Label>
          <Select {...form.register('kind')}>
            <option value="recurring">Recorrente</option>
            <option value="one_time">Avulsa</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Valor líquido (R$) *</Label>
            <Input type="number" step="0.01" placeholder="0,00" {...form.register('net_brl')} error={!!errors.net_brl} />
            {errors.net_brl && <p className="text-xs text-negative">{errors.net_brl.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Valor bruto (R$)</Label>
            <Input type="number" step="0.01" placeholder="Opcional" {...form.register('gross_brl')} />
          </div>
        </div>

        {kind === 'recurring' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Recorrência *</Label>
              <Select {...form.register('recurrence')}>
                <option value="monthly">Mensal</option>
                <option value="weekly">Semanal</option>
                <option value="biweekly">Quinzenal</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Dia de recebimento *</Label>
              <Input type="number" min={1} max={31} placeholder="1–31" {...form.register('day_of_month')} error={!!errors.day_of_month} />
              {errors.day_of_month && <p className="text-xs text-negative">{errors.day_of_month.message}</p>}
            </div>
          </div>
        )}

        {kind === 'one_time' && (
          <div className="space-y-1.5">
            <Label>Período de recebimento *</Label>
            <p className="text-xs text-text-muted">Informe em quais meses você receberá este valor.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-text-muted">Mês inicial</Label>
                <Input type="month" {...form.register('first_month')} error={!!errors.first_month} />
                {errors.first_month && <p className="text-xs text-negative">{errors.first_month.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-text-muted">Mês final (opcional)</Label>
                <Input type="month" {...form.register('last_month')} error={!!errors.last_month} />
                {errors.last_month && <p className="text-xs text-negative">{errors.last_month.message}</p>}
                <p className="text-xs text-text-muted">Deixe vazio para receber apenas no mês inicial.</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isPending}>{editing ? 'Salvar' : 'Adicionar'}</Button>
        </div>
      </form>
    </Dialog>
  )
}
