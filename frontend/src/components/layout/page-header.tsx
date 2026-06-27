import { type ReactNode } from 'react'

interface PageHeaderProps {
  title:        string
  description?: string
  action?:      ReactNode
  extra?:       ReactNode
}

export function PageHeader({ title, description, action, extra }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-text-strong">{title}</h1>
          {extra}
        </div>
        {description && (
          <p className="text-sm text-text-muted mt-1">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
