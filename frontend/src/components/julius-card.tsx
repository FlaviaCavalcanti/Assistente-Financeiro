import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface JuliusCardProps {
  quote:      string
  /** 'insight' = dismissível manualmente (Painel).
   *  'toast'   = some-dismisses após autoDismissMs (Gastos, Renda). */
  variant?:        'insight' | 'toast'
  autoDismissMs?:  number
  onDismiss?:      () => void
}

export function JuliusCard({
  quote,
  variant        = 'insight',
  autoDismissMs  = 5000,
  onDismiss,
}: JuliusCardProps) {
  const [visible, setVisible] = useState(true)

  const dismiss = () => {
    setVisible(false)
    onDismiss?.()
  }

  // Auto-dismiss para variante toast
  useEffect(() => {
    if (variant !== 'toast') return
    const t = setTimeout(dismiss, autoDismissMs)
    return () => clearTimeout(t)
  }, [quote, variant, autoDismissMs])

  // Re-exibe quando a frase muda (nova ação do usuário)
  useEffect(() => { setVisible(true) }, [quote])

  if (!visible) return null

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3"
      style={{ borderLeftWidth: '3px', borderLeftColor: '#F59E0B' }}
    >
      {/* Badge "J" */}
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
        style={{ backgroundColor: '#F59E0B', color: '#0D1520' }}
      >
        J
      </span>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <p className="text-sm italic text-text-strong leading-snug">
          "{quote}"
        </p>
        <p className="mt-1 text-xs text-text-muted">— Julius</p>
      </div>

      {/* Fechar */}
      <button
        onClick={dismiss}
        className="mt-0.5 shrink-0 text-text-muted hover:text-text transition-colors"
        aria-label="Fechar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
