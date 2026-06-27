import * as RadixTabs from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

export const Tabs = RadixTabs.Root

export function TabsList({ className, ...props }: RadixTabs.TabsListProps) {
  return (
    <RadixTabs.List
      className={cn(
        'inline-flex gap-1 rounded-lg bg-ground-surface p-1 border border-border',
        className
      )}
      {...props}
    />
  )
}

export function TabsTrigger({ className, ...props }: RadixTabs.TabsTriggerProps) {
  return (
    <RadixTabs.Trigger
      className={cn(
        'px-4 py-1.5 text-sm font-medium rounded-md text-text-muted',
        'transition-colors hover:text-text',
        'data-[state=active]:bg-brand data-[state=active]:text-white',
        className
      )}
      {...props}
    />
  )
}

export const TabsContent = RadixTabs.Content
