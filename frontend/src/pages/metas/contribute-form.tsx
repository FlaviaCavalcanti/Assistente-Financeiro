import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useContributeGoal } from '@/hooks/use-goals'
import { floatToCents } from '@/lib/format'
import type { Goal } from '@/types/api'

const schema = z.object({
  amount_brl: z.coerce.number().positive('Valor deve ser maior que zero'),
})

type FormData = z.infer<typeof schema>

interface ContributeFormProps {
  open:    boolean
  onClose: () => void
  goal:    Goal
}

export function ContributeForm({ open, onClose, goal }: ContributeFormProps) {
  const [apiError, setApiError] = useState('')
  const contribute = useContributeGoal()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  })

  async function onSubmit(data: any) {
    setApiError('')
    try {
      await contribute.mutateAsync({ id: goal.id, data: { amount_cents: floatToCents(data.amount_brl) } })
      reset()
      onClose()
    } catch (e: any) {
      setApiError(e?.message ?? 'Erro ao registrar aporte')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Aportar em "${goal.name}"`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
        <div className="space-y-1">
          <Label>Valor do aporte (R$)</Label>
          <Input type="number" step="0.01" min={0.01} {...register('amount_brl')} placeholder="0,00" autoFocus />
          {errors.amount_brl && <p className="text-sm text-negative">{errors.amount_brl.message}</p>}
        </div>

        {apiError && <p className="text-sm text-negative">{apiError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={contribute.isPending}>
            {contribute.isPending ? 'Salvando…' : 'Aportar'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
