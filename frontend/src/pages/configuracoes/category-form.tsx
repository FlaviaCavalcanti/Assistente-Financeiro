import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CategoryIcon } from '@/components/category-icon'
import { useCreateCategory, useUpdateCategory } from '@/hooks/use-categories'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/api'

const PALETTE = [
  '#2DD4BF', '#818CF8', '#FB7185', '#FBBF24', '#34D399',
  '#60A5FA', '#F472B6', '#A78BFA', '#10B981', '#F97316',
  '#06B6D4', '#84CC16', '#EC4899', '#8B5CF6', '#EF4444',
]

const ICONS = [
  'shopping-cart', 'utensils', 'car', 'home', 'heart',
  'graduation-cap', 'briefcase', 'plane', 'gamepad-2', 'music',
  'shirt', 'zap', 'wifi', 'phone', 'monitor',
  'baby', 'dumbbell', 'pill', 'dog', 'book',
  'coffee', 'gift', 'tv', 'sparkles', 'wallet',
  'landmark', 'building-2', 'bus', 'train', 'bike',
]

const schema = z.object({
  name:  z.string().min(1, 'Nome obrigatório').max(40),
  color: z.string().min(1),
  icon:  z.string().min(1),
})
type FormData = z.infer<typeof schema>

interface CategoryFormProps {
  open:     boolean
  onClose:  () => void
  editing?: Category
}

export function CategoryForm({ open, onClose, editing }: CategoryFormProps) {
  const createMut = useCreateCategory()
  const updateMut = useUpdateCategory()
  const [iconSearch, setIconSearch] = useState('')

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? { name: editing.name, color: editing.color, icon: editing.icon }
      : { name: '', color: PALETTE[0], icon: 'shopping-cart' },
  })

  const selectedColor = form.watch('color')
  const selectedIcon  = form.watch('icon')

  const filteredIcons = iconSearch
    ? ICONS.filter(i => i.includes(iconSearch.toLowerCase()))
    : ICONS

  const onSubmit = form.handleSubmit(async (data) => {
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, data })
    } else {
      await createMut.mutateAsync(data)
    }
    onClose()
    form.reset()
    setIconSearch('')
  })

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? 'Editar categoria' : 'Nova categoria'}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Preview */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-ground-raised border border-border">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
            style={{ backgroundColor: selectedColor + '22', color: selectedColor }}
          >
            <CategoryIcon iconName={selectedIcon} className="h-5 w-5" />
          </span>
          <span className="font-medium text-text-strong">
            {form.watch('name') || 'Prévia da categoria'}
          </span>
        </div>

        <div className="space-y-1.5">
          <Label>Nome *</Label>
          <Input
            placeholder="Ex: Educação"
            {...form.register('name')}
            error={!!form.formState.errors.name}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-negative">{form.formState.errors.name.message}</p>
          )}
        </div>

        {/* Color picker */}
        <div className="space-y-2">
          <Label>Cor *</Label>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => form.setValue('color', color)}
                className={cn(
                  'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                  selectedColor === color ? 'border-text-strong scale-110' : 'border-transparent',
                )}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            {/* Custom hex */}
            <label className="h-7 w-7 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-text-muted transition-colors overflow-hidden">
              <input
                type="color"
                value={selectedColor}
                onChange={e => form.setValue('color', e.target.value)}
                className="opacity-0 absolute"
              />
              <span className="text-[10px] text-text-muted select-none">+</span>
            </label>
          </div>
        </div>

        {/* Icon picker */}
        <div className="space-y-2">
          <Label>Ícone *</Label>
          <Input
            placeholder="Buscar ícone..."
            value={iconSearch}
            onChange={e => setIconSearch(e.target.value)}
          />
          <div className="grid grid-cols-8 gap-1.5 max-h-36 overflow-y-auto rounded-lg border border-border p-2 bg-ground-raised">
            {filteredIcons.map(name => (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => form.setValue('icon', name)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                  selectedIcon === name
                    ? 'bg-brand/20 text-brand'
                    : 'text-text-muted hover:bg-ground hover:text-text',
                )}
              >
                <CategoryIcon iconName={name} className="h-4 w-4" />
              </button>
            ))}
            {filteredIcons.length === 0 && (
              <span className="col-span-8 text-center text-xs text-text-muted py-2">
                Nenhum ícone encontrado
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isPending}>
            {editing ? 'Salvar' : 'Criar categoria'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
