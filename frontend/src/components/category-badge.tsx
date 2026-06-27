import { cn } from '@/lib/utils'
import { CategoryIcon } from './category-icon'
import type { Category } from '@/types/api'

interface CategoryBadgeProps {
  category:  Category
  showIcon?: boolean
  className?: string
}

export function CategoryBadge({ category, showIcon = true, className }: CategoryBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', className)}>
      <span
        className="h-2.5 w-2.5 rounded-full shrink-0"
        style={{ backgroundColor: category.color }}
      />
      {showIcon && (
        <CategoryIcon
          iconName={category.icon}
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: category.color }}
        />
      )}
      <span className="text-text">{category.name}</span>
    </span>
  )
}
