import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useCreateGoal, useUpdateGoal } from '@/hooks/use-goals'
import { floatToCents } from '@/lib/format'
import type { Goal, Summary } from '@/types/api'

const COLORS = [
  { label: 'Índigo',    value: '#818CF8' },
  { label: 'Esmeralda', value: '#34D399' },
  { label: 'Âmbar',    value: '#FBBF24' },
  { label: 'Rosa',      value: '#F472B6' },
  { label: 'Céu',       value: '#38BDF8' },
  { label: 'Coral',     value: '#FB7185' },
]

const schema = z.discriminatedUnion('kind', [
  z.object({
    kind:          z.literal('emergency_fund'),
    name:          z.string().min(1, 'Nome obrigatório'),
    target_months: z.coerce.number().int().min(1, 'Mínimo 1 mês'),
    current_brl:   z.coerce.number().min(0).default(0),
    color:         z.string().min(1),
  }),
  z.object({
    kind:        z.literal('purchase'),
    name:        z.string().min(1, 'Nome obrigatório'),
    target_brl:  z.coerce.number().positive('Valor alvo obrigatório'),
    current_brl: z.coerce.number().min(0).default(0),
    deadline:    z.string().optional(),
    color:       z.string().min(1),
  }),
])

type FormData = z.infer<typeof schema>

interface GoalFormProps {
  open:    boolean
  onClose: () => void
  summary: Summary | undefined
  goal?:   Goal
}

export function GoalForm({ open, onClose, summary, goal }: GoalFormProps) {
  const [apiError, setApiError] = useState('')
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const isPending  = createGoal.isPending || updateGoal.isPending
  const isEdit     = !!goal

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver:      zodResolver(schema) as any,
    defaultValues: { kind: 'emergency_fund', target_months: 6, current_brl: 0, color: '#818CF8' } as any,
  })

  // Re-preenche o formulário sempre que o diálogo abre (ou muda de meta)
  useEffect(() => {
    if (!open) return
    setApiError('')
    if (goal) {
      if (goal.kind === 'emergency_fund') {
        reset({
          kind:          'emergency_fund',
          name:          goal.name,
          target_months: goal.target_months,
          current_brl:   goal.current_cents / 100,
          color:         goal.color,
        } as any)
      } else {
        reset({
          kind:        'purchase',
          name:        goal.name,
          target_brl:  goal.target_cents / 100,
          current_brl: goal.current_cents / 100,
          deadline:    goal.deadline || '',
          color:       goal.color,
        } as any)
      }
    } else {
      reset({ kind: 'emergency_fund', target_months: 6, current_brl: 0, color: '#818CF8' } as any)
    }
  }, [open, goal?.id])

  const kind = watch('kind' as any) as string

  const monthlyExpenses = summary
    ? (summary.fixed_expense_cents + summary.variable_expense_cents) / 100
    : 0

  async function onSubmit(data: FormData) {
    setApiError('')
    try {
      if (isEdit && goal) {
        if (data.kind === 'emergency_fund') {
          const targetCents = monthlyExpenses > 0
            ? Math.round(monthlyExpenses * data.target_months * 100)
            : goal.target_cents
          await updateGoal.mutateAsync({
            id: goal.id,
            data: {
              name:          data.name,
              target_cents:  targetCents,
              target_months: data.target_months,
              current_cents: floatToCents(data.current_brl),
              color:         data.color,
            },
          })
        } else {
          await updateGoal.mutateAsync({
            id: goal.id,
            data: {
              name:          data.name,
              target_cents:  floatToCents(data.target_brl),
              current_cents: floatToCents(data.current_brl),
              deadline:      data.deadline ?? '',
              color:         data.color,
            },
          })
        }
      } else {
        if (data.kind === 'emergency_fund') {
          const targetCents = Math.round(monthlyExpenses * data.target_months * 100)
          await createGoal.mutateAsync({
            name:          data.name,
            kind:          'emergency_fund',
            target_cents:  targetCents,
            target_months: data.target_months,
            current_cents: floatToCents(data.current_brl),
            deadline:      '',
            icon:          'shield',
            color:         data.color,
          })
        } else {
          await createGoal.mutateAsync({
            name:          data.name,
            kind:          'purchase',
            target_cents:  floatToCents(data.target_brl),
            target_months: 0,
            current_cents: floatToCents(data.current_brl),
            deadline:      data.deadline ?? '',
            icon:          'target',
            color:         data.color,
          })
        }
      }
      reset()
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar meta'
      setApiError(msg)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? 'Editar meta' : 'Nova meta'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">

        <div className="space-y-1">
          <Label>Tipo de meta</Label>
          <Select {...register('kind' as any)} disabled={isEdit}>
            <option value="emergency_fund">Reserva de emergência</option>
            <option value="purchase">Compra planejada</option>
          </Select>
          {isEdit && (
            <p className="text-xs text-text-muted">O tipo não pode ser alterado após a criação.</p>
          )}
        </div>

        <div className="space-y-1">
          <Label>Nome</Label>
          <Input {...register('name' as any)} placeholder="Ex.: Reserva 6 meses" />
          {(errors as any).name && <p className="text-sm text-negative">{(errors as any).name.message}</p>}
        </div>

        {kind === 'emergency_fund' && (
          <div className="space-y-1">
            <Label>Quantos meses de reserva?</Label>
            <Input type="number" min={1} {...register('target_months' as any)} />
            {monthlyExpenses > 0 && (
              <p className="text-xs text-text-muted">
                Meta: R$ {(monthlyExpenses * Number((watch as any)('target_months') || 6)).toFixed(2).replace('.', ',')}
                {' '}(baseado nas despesas do mês atual)
              </p>
            )}
            {(errors as any).target_months && <p className="text-sm text-negative">{(errors as any).target_months.message}</p>}
          </div>
        )}

        {kind === 'purchase' && (
          <>
            <div className="space-y-1">
              <Label>Valor alvo (R$)</Label>
              <Input type="number" step="0.01" min={0.01} {...register('target_brl' as any)} placeholder="0,00" />
              {(errors as any).target_brl && <p className="text-sm text-negative">{(errors as any).target_brl.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Prazo (opcional)</Label>
              <Input type="month" {...register('deadline' as any)} />
              <p className="text-xs text-text-muted">Deixe vazio se não houver prazo definido.</p>
            </div>
          </>
        )}

        <div className="space-y-1">
          <Label>Já tenho guardado (R$)</Label>
          <Input type="number" step="0.01" min={0} {...register('current_brl' as any)} placeholder="0,00" />
          {isEdit && (
            <p className="text-xs text-text-muted">Para adicionar um novo aporte, use o botão "Registrar aporte" no card.</p>
          )}
        </div>

        <div className="space-y-1">
          <Label>Cor</Label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <label key={c.value} className="cursor-pointer">
                <input type="radio" value={c.value} {...register('color' as any)} className="sr-only" />
                <span
                  className="block h-7 w-7 rounded-full transition-all"
                  style={{
                    background:    c.value,
                    outline:       (watch as any)('color') === c.value ? `3px solid ${c.value}` : '3px solid transparent',
                    outlineOffset: '2px',
                  }}
                  title={c.label}
                />
              </label>
            ))}
          </div>
        </div>

        {apiError && <p className="text-sm text-negative">{apiError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar meta'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
