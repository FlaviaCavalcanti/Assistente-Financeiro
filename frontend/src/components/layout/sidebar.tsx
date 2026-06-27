import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ScrollText, TrendingUp,
  TrendingDown, CreditCard, Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/painel',  icon: LayoutDashboard, label: 'Painel'   },
  { to: '/extrato', icon: ScrollText,      label: 'Extrato'  },
  { to: '/renda',   icon: TrendingUp,      label: 'Renda'    },
  { to: '/gastos',  icon: TrendingDown,    label: 'Gastos'   },
  { to: '/dividas', icon: CreditCard,      label: 'Dívidas'  },
]

const bottomItems = [
  { to: '/configuracoes', icon: Settings2, label: 'Configurações' },
]

function NavItem({ to, icon: Icon, label }: { to: string; icon: typeof LayoutDashboard; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-brand-subtle text-brand'
            : 'text-text-muted hover:text-text hover:bg-ground-raised'
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </NavLink>
  )
}

export function Sidebar() {
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-ground-surface sticky top-0">
      <div className="px-4 py-5 border-b border-border">
        <p className="text-sm font-semibold text-text-strong">Assistente Financeiro</p>
        <p className="text-xs text-text-muted mt-0.5">Finanças pessoais</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3 overflow-y-auto">
        {navItems.map(item => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      <div className="border-t border-border p-3">
        {bottomItems.map(item => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
    </aside>
  )
}
