import type { ComponentType } from 'react'
import * as LucideIcons from 'lucide-react'
import { Circle, type LucideProps } from 'lucide-react'
import { toPascalCase } from '@/lib/utils'

interface CategoryIconProps extends LucideProps {
  iconName: string
}

export function CategoryIcon({ iconName, ...props }: CategoryIconProps) {
  const name = toPascalCase(iconName) as keyof typeof LucideIcons
  const Icon = (LucideIcons[name] as ComponentType<LucideProps>) ?? Circle
  return <Icon {...props} />
}
