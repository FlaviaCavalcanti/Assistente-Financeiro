# Spec — Assistente Financeiro (Frontend)

> Spec-Driven Development: nada é implementado sem estar descrito e aceito aqui.
> Escopo: **SPA React** consumindo a API em `http://127.0.0.1:8080/api/v1`.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Design System](#2-design-system)
3. [Stack e Dependências](#3-stack-e-dependências)
4. [Configuração do Projeto](#4-configuração-do-projeto)
5. [Estrutura de Pastas](#5-estrutura-de-pastas)
6. [Camada de API](#6-camada-de-api)
7. [Roteamento](#7-roteamento)
8. [Layout Principal](#8-layout-principal)
9. [Telas](#9-telas)
10. [Componentes Compartilhados](#10-componentes-compartilhados)
11. [Formulários e Validação](#11-formulários-e-validação)
12. [Estados Especiais](#12-estados-especiais)
13. [Utilitários de Formatação](#13-utilitários-de-formatação)
14. [Build e Integração com Go](#14-build-e-integração-com-go)
15. [Critérios de Aceite](#15-critérios-de-aceite)

---

## 1. Visão Geral

### Objetivo

O frontend é a única interface de usuário do Assistente Financeiro. Seu trabalho é transformar dados financeiros brutos (centavos, timestamps, UUIDs) em clareza visual — o usuário deve entender sua situação financeira em segundos, não em minutos.

### Princípios inegociáveis

- **Dinheiro formatado apenas na camada de apresentação.** A API entrega centavos (`int64`); o frontend converte para `R$ X.XXX,XX` na renderização. Nunca o inverso.
- **Feedback imediato.** Toda mutação (criar, editar, deletar) usa optimistic update ou feedback visual instantâneo — sem esperar o servidor para atualizar a tela.
- **Erros são instrutivos.** Mensagens de erro explicam o que deu errado e como corrigir. Nunca mensagens genéricas como "Ocorreu um erro".
- **Local-first.** O backend roda em `127.0.0.1:8080`. O frontend não usa nenhum serviço externo, CDN de imagens ou analytics.
- **Single-user.** Sem auth no MVP. A API já fica atrás de `127.0.0.1` — sem login, sem tokens, sem multiusuário.

### Referência de API

- Base URL (dev): `http://127.0.0.1:8080/api/v1`
- Base URL (prod): `/api/v1` (mesmo servidor Go via `embed.FS`)
- Formato monetário: `int64` em centavos
- Formato de data: `YYYY-MM-DD` ou `YYYY-MM-DDTHH:MM:SSZ`
- Erros: `{ "error": { "code": "NOT_FOUND", "message": "..." } }`

---

## 2. Design System

### 2.1 Filosofia

O Assistente Financeiro é uma ferramenta de uso pessoal, noturno, íntimo — o usuário olha para seus números quando o dia termina. O design deve ser **sério sem ser frio, claro sem ser clínico**.

Decisão: **tema escuro por padrão**, com tipografia precisa e hierarquia de cores que comunica direção do dinheiro antes que o número seja lido.

**Risco estético adotado:** usar `teal (#2DD4BF)` para valores positivos (entrada de dinheiro) ao invés do verde convencional. O teal lê como "liquidez" — dinheiro em fluxo, ativo, disponível. O verde já está ocupado pela categoria Alimentação (`#10B981`) — usar o mesmo tom criaria ambiguidade visual nas telas que misturam valores e categorias.

### 2.2 Paleta de Cores

```
TOKENS GLOBAIS
──────────────────────────────────────────────────────────────
  --color-ground:          #0D1520   ← fundo da aplicação
  --color-surface:         #131F2E   ← cards, panels
  --color-surface-raised:  #1A2840   ← modais, dropdowns
  --color-border:          #1E3550   ← bordas padrão
  --color-border-subtle:   #162840   ← separadores, divisores

TEXTO
──────────────────────────────────────────────────────────────
  --color-text:            #D6E4EF   ← texto principal
  --color-text-strong:     #F0F6FA   ← headings, valores em destaque
  --color-text-muted:      #5E8097   ← labels, captions, placeholders

SEMÂNTICO (dinheiro)
──────────────────────────────────────────────────────────────
  --color-positive:        #2DD4BF   ← crédito, saldo positivo, renda
  --color-negative:        #FB7185   ← débito, saldo negativo, gasto
  --color-warning:         #FBBF24   ← alertas, dívidas próximas do vencimento

INTERAÇÃO (brand)
──────────────────────────────────────────────────────────────
  --color-brand:           #818CF8   ← botões primários, links, foco
  --color-brand-hover:     #6366F1   ← hover state do brand
  --color-brand-subtle:    #1E2A4A   ← background de elementos com brand

CATEGORIAS DO SISTEMA (definidas pelo backend — seed)
──────────────────────────────────────────────────────────────
  Moradia:       #3B82F6   (blue-500)
  Alimentação:   #10B981   (emerald-500)
  Transporte:    #F59E0B   (amber-500)
  Saúde:         #EF4444   (red-500)
  Educação:      #8B5CF6   (violet-500)
  Lazer:         #EC4899   (pink-500)
  Assinaturas:   #6366F1   (indigo-500)
  Outros:        #6B7280   (slate-500)
```

### 2.3 Tipografia

Dois papéis tipográficos bem distintos:

| Papel | Fonte | Quando usar |
|---|---|---|
| **Números / Dados** | `DM Mono` (Google Fonts) | Valores em R$, percentuais, contadores, datas em tabelas |
| **Interface / Texto** | `Inter` (Google Fonts) | Labels, headings, botões, body text, mensagens |

**Por que DM Mono para números?**  
Em tabelas financeiras, alinhamento de dígitos é crítico. DM Mono garante que todos os dígitos têm exatamente a mesma largura (`font-variant-numeric: tabular-nums` está implícito em monospace), então colunas de valores ficam perfeitamente alinhadas sem CSS extra. É também uma fonte com personalidade — não é a Courier genérica.

```css
/* Importar no index.html (Google Fonts, self-hosted para produção) */
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600;700&display=swap');

/* CSS Variables */
--font-sans:  'Inter', system-ui, -apple-system, sans-serif;
--font-mono:  'DM Mono', 'Fira Code', 'Cascadia Code', monospace;
```

**Escala tipográfica:**

| Token | Tamanho | Peso | Fonte | Uso |
|---|---|---|---|---|
| `text-display` | 2rem / 32px | 700 | Inter | Valores grandes no dashboard |
| `text-title` | 1.25rem / 20px | 600 | Inter | Títulos de seção, card headers |
| `text-body` | 0.875rem / 14px | 400 | Inter | Corpo de texto padrão |
| `text-label` | 0.75rem / 12px | 500 | Inter | Labels, badges, tags |
| `text-caption` | 0.6875rem / 11px | 400 | Inter | Timestamps, metadata |
| `text-amount` | 1rem / 16px | 500 | DM Mono | Valores em R$ em tabelas |
| `text-amount-lg` | 1.5rem / 24px | 500 | DM Mono | Valores em KPI cards |
| `text-amount-xl` | 2rem / 32px | 500 | DM Mono | Saldo principal |

### 2.4 Iconografia

**Biblioteca:** `lucide-react` — escolhida porque:
1. O backend já armazena nomes de ícones no campo `icon` das categorias (ex: `"home"`, `"utensils"`, `"car"`) — todos são nomes válidos do Lucide
2. Ícones clean, monoline, 24x24 padrão
3. Tree-shakeable — só importa o que usa

```typescript
// Uso padrão
import { Home, Utensils, CreditCard } from 'lucide-react'

// Para renderizar ícone de categoria dinamicamente (por nome do banco)
import * as Icons from 'lucide-react'
const Icon = Icons[toPascalCase(category.icon)] ?? Icons.Circle
```

**Mapeamento de ícones por entidade:**

| Entidade | Ícone |
|---|---|
| Painel | `LayoutDashboard` |
| Extrato | `ScrollText` |
| Renda | `TrendingUp` |
| Gastos | `TrendingDown` |
| Dívidas | `CreditCard` |
| Configurações | `Settings2` |
| Renda recorrente | `Repeat` |
| Renda avulsa | `Zap` |
| Gasto fixo | `Calendar` |
| Gasto variável | `ShoppingCart` |
| Cartão de crédito | `CreditCard` |
| Empréstimo | `Landmark` |
| Parcelamento | `Receipt` |
| Adicionar | `Plus` |
| Editar | `Pencil` |
| Excluir/Desativar | `Trash2` |
| Pagar parcela | `CheckCircle2` |

### 2.5 Espaçamento

Usar o sistema de espaçamento padrão do Tailwind (base 4px). Convenções do projeto:

| Token | Valor | Uso |
|---|---|---|
| `p-3` | 12px | Padding interno de badges, small chips |
| `p-4` | 16px | Padding interno de cards menores |
| `p-5` | 20px | Padding interno de cards padrão |
| `p-6` | 24px | Padding interno de modais, seções |
| `gap-3` | 12px | Gap entre items em listas |
| `gap-4` | 16px | Gap entre cards em grids |
| `gap-6` | 24px | Gap entre seções |

**Grid do layout principal:**
- Sidebar: `w-60` (240px) expandida, `w-14` (56px) colapsada
- Conteúdo principal: `flex-1`, `max-w-7xl`, `mx-auto`, `px-6`

### 2.6 Elevação (Shadows)

```css
/* shadows.css — definir como utilitários Tailwind customizados */
--shadow-card:   0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
--shadow-modal:  0 20px 60px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4);
--shadow-dropdown: 0 4px 16px rgba(0,0,0,0.5);
```

### 2.7 Border Radius

```
rounded-sm   → 4px   (badges, chips)
rounded      → 6px   (inputs, buttons)
rounded-lg   → 8px   (cards padrão)
rounded-xl   → 12px  (modais, cards grandes)
rounded-full → 9999px (avatares de categoria, toggles)
```

### 2.8 Animações

**Regra:** uma única animação orquestrada por transição de página. Dentro das telas, apenas transições de estado (hover, focus, loading skeleton).

```css
/* Transição padrão para hover states */
transition: color 150ms ease, background-color 150ms ease, border-color 150ms ease;

/* Entrada de cards no dashboard (stagger manual via delay) */
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Skeleton loading */
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position: 200% 0; }
}
```

**Respeitar `prefers-reduced-motion`:** envolver todas as animações em `@media (prefers-reduced-motion: no-preference)`.

---

## 3. Stack e Dependências

### package.json

```json
{
  "name": "assistente-financeiro-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "@tanstack/react-query": "^5.56.0",
    "@tanstack/react-query-devtools": "^5.56.0",
    "recharts": "^2.12.7",
    "react-hook-form": "^7.53.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.23.8",
    "lucide-react": "^0.441.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.2",
    "date-fns": "^3.6.0",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-select": "^2.1.1",
    "@radix-ui/react-popover": "^1.1.1",
    "@radix-ui/react-tooltip": "^1.1.2",
    "@radix-ui/react-alert-dialog": "^1.1.1",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-switch": "^1.1.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.3",
    "tailwindcss": "^3.4.11",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.45",
    "eslint": "^9.9.0",
    "@typescript-eslint/eslint-plugin": "^8.3.0"
  }
}
```

**Justificativas de escolha:**

| Pacote | Por quê |
|---|---|
| `react-router-dom v6` | Roteamento client-side; `<Outlet>` para layouts aninhados |
| `@tanstack/react-query v5` | Cache de servidor, refetch automático, mutations com invalidação; evita `useEffect` para fetch |
| `recharts` | Charts declarativos, SVG, funciona sem build extra; perfeito para donut chart de categorias |
| `react-hook-form + zod` | Form state sem re-render desnecessário; Zod infere tipos TS dos schemas automaticamente |
| `lucide-react` | Ícones alinhados com os `icon` strings que o backend armazena nas categorias |
| `@radix-ui/*` | Primitivos acessíveis (WAI-ARIA), sem estilos impostos, composável com Tailwind |
| `date-fns` | Manipulação de datas leve, tree-shakeable, sem globals; `pt-BR` locale embutido |
| `clsx + tailwind-merge` | Composição de classes Tailwind sem conflitos (substitui `classnames`) |

**Não usar:**
- ~~`axios`~~ — `fetch` nativo é suficiente para uma API local
- ~~`moment.js`~~ — substituído por `date-fns`
- ~~`styled-components`~~ — Tailwind cobre todos os casos
- ~~`redux`~~ — TanStack Query gerencia estado de servidor; estado local é mínimo

---

## 4. Configuração do Projeto

### 4.1 vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Em dev: /api/* → Go server em :8080
      // Em prod: SPA e API no mesmo processo Go (embed.FS)
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../backend/static',  // Go vai embutir esta pasta
    emptyOutDir: true,
  },
})
```

### 4.2 tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design tokens do projeto
        ground: {
          DEFAULT: '#0D1520',
          surface: '#131F2E',
          raised:  '#1A2840',
        },
        border: {
          DEFAULT: '#1E3550',
          subtle:  '#162840',
        },
        text: {
          DEFAULT: '#D6E4EF',
          strong:  '#F0F6FA',
          muted:   '#5E8097',
        },
        positive: '#2DD4BF',
        negative: '#FB7185',
        brand: {
          DEFAULT: '#818CF8',
          hover:   '#6366F1',
          subtle:  '#1E2A4A',
        },
        warning: '#FBBF24',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['DM Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'amount':    ['1rem',    { lineHeight: '1.5', fontWeight: '500' }],
        'amount-lg': ['1.5rem',  { lineHeight: '1.2', fontWeight: '500' }],
        'amount-xl': ['2rem',    { lineHeight: '1.1', fontWeight: '500' }],
      },
      boxShadow: {
        'card':     '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'modal':    '0 20px 60px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)',
        'dropdown': '0 4px 16px rgba(0,0,0,0.5)',
      },
      animation: {
        'fade-slide-up': 'fadeSlideUp 250ms ease forwards',
        'shimmer':        'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeSlideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to:   { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
```

### 4.3 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 4.4 src/main.tsx

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import { queryClient } from '@/lib/queryClient'
import App from './app'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
)
```

### 4.5 src/index.css

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    color-scheme: dark;
  }

  * {
    box-sizing: border-box;
  }

  body {
    @apply bg-ground text-text font-sans antialiased;
    min-height: 100vh;
  }

  /* Scrollbar customizado para tema escuro */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { @apply bg-ground; }
  ::-webkit-scrollbar-thumb { @apply bg-border rounded-full; }
  ::-webkit-scrollbar-thumb:hover { @apply bg-brand/50; }
}

@layer utilities {
  /* Animações só para quem não pediu reduced-motion */
  @media (prefers-reduced-motion: no-preference) {
    .animate-fade-slide-up { animation: fadeSlideUp 250ms ease forwards; }
  }

  /* Helper para números tabulares em DM Mono */
  .tabular { @apply font-mono; font-variant-numeric: tabular-nums; }
}
```

---

## 5. Estrutura de Pastas

```
frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
├── package.json
│
└── src/
    ├── main.tsx                        # Bootstrap: providers + router
    ├── app.tsx                         # Rotas raiz com <AppShell>
    ├── index.css                       # Tailwind base + fontes
    │
    ├── lib/
    │   ├── api.ts                      # fetch wrapper (URL base, erros, tipos)
    │   ├── format.ts                   # formatMoney, formatDate, formatBPS
    │   ├── queryClient.ts              # instância do QueryClient
    │   └── utils.ts                    # cn() (clsx + twMerge), toPascalCase()
    │
    ├── types/
    │   └── api.ts                      # Todos os tipos TS espelhando o backend
    │
    ├── hooks/                          # TanStack Query — um arquivo por domínio
    │   ├── use-summary.ts              # useMonthSummary(month)
    │   ├── use-categories.ts           # useCategories, useMutateCategory
    │   ├── use-income-sources.ts       # useIncomeSources, useMutateIncomeSource
    │   ├── use-expenses.ts             # useExpenses, useMutateExpense
    │   ├── use-debts.ts                # useDebts, useMutateDebt
    │   ├── use-installment-plans.ts    # useInstallmentPlans, usePayInstallment
    │   └── use-transactions.ts         # useTransactions, useMutateTransaction
    │
    ├── components/
    │   ├── ui/                         # Primitivos de UI (Radix + Tailwind)
    │   │   ├── button.tsx
    │   │   ├── input.tsx
    │   │   ├── label.tsx
    │   │   ├── select.tsx
    │   │   ├── dialog.tsx
    │   │   ├── alert-dialog.tsx
    │   │   ├── tabs.tsx
    │   │   ├── badge.tsx
    │   │   ├── separator.tsx
    │   │   ├── tooltip.tsx
    │   │   └── switch.tsx
    │   │
    │   ├── layout/
    │   │   ├── app-shell.tsx           # Sidebar + main content wrapper
    │   │   ├── sidebar.tsx             # Navegação lateral
    │   │   └── page-header.tsx         # Título + ações da página
    │   │
    │   ├── money-display.tsx           # R$ com cor positivo/negativo
    │   ├── category-badge.tsx          # Bolinha colorida + nome
    │   ├── category-icon.tsx           # Ícone Lucide dinâmico por nome
    │   ├── month-picker.tsx            # Seletor YYYY-MM com ← →
    │   ├── data-table.tsx              # Tabela genérica com colunas tipadas
    │   ├── confirm-dialog.tsx          # Dialog de confirmação destrutiva
    │   ├── form-modal.tsx              # Modal wrapper para formulários
    │   ├── empty-state.tsx             # Estado vazio com ícone + CTA
    │   ├── loading-skeleton.tsx        # Skeleton animado
    │   └── error-message.tsx          # Mensagem de erro inline
    │
    └── pages/
        ├── painel/
        │   ├── index.tsx               # Página Dashboard
        │   ├── summary-cards.tsx       # 4 KPI cards
        │   ├── category-chart.tsx      # Donut chart Recharts
        │   └── recent-transactions.tsx # Mini lista (últimas 5)
        │
        ├── extrato/
        │   ├── index.tsx               # Página Extrato
        │   ├── transaction-filters.tsx # Barra de filtros
        │   ├── transaction-table.tsx   # Tabela paginada
        │   └── transaction-form.tsx    # Modal: criar/editar lançamento
        │
        ├── renda/
        │   ├── index.tsx               # Página Renda
        │   ├── income-card.tsx         # Card de uma fonte de renda
        │   └── income-form.tsx         # Modal: criar/editar fonte
        │
        ├── gastos/
        │   ├── index.tsx               # Página Gastos (tabs fixo/variável)
        │   ├── expense-list.tsx        # Lista de gastos por tipo
        │   ├── expense-card.tsx        # Card de um gasto
        │   └── expense-form.tsx        # Modal: criar/editar gasto
        │
        ├── dividas/
        │   ├── index.tsx               # Página Dívidas (tabs cartão/empréstimo)
        │   ├── debt-card.tsx           # Card de uma dívida
        │   ├── debt-form.tsx           # Modal: criar/editar dívida
        │   ├── installment-section.tsx # Seção de parcelamentos ativos
        │   ├── installment-card.tsx    # Card de um parcelamento
        │   └── installment-form.tsx    # Modal: criar parcelamento
        │
        └── configuracoes/
            ├── index.tsx               # Página Configurações
            ├── category-grid.tsx       # Grid de categorias
            └── category-form.tsx       # Modal: criar/editar categoria
```

---

## 6. Camada de API

### 6.1 Tipos TypeScript (`src/types/api.ts`)

```typescript
// Tipos espelham EXATAMENTE o contrato Go do backend.
// Valores monetários: sempre Cents (int64 em centavos, nunca float).

export type Cents = number

// ── Enums ──────────────────────────────────────────────────────────

export type IncomeKind    = 'recurring' | 'one_time'
export type RecurrenceKind = 'monthly' | 'weekly' | 'biweekly' | 'none'
export type ExpenseKind   = 'fixed' | 'variable'
export type DebtKind      = 'credit_card' | 'loan'
export type Direction     = 'credit' | 'debit'
export type SourceKind    = 'income' | 'expense' | 'debt_payment' | 'installment'

// ── Entidades ──────────────────────────────────────────────────────

export interface Category {
  id:         string
  name:       string
  color:      string   // hex CSS, ex: "#3B82F6"
  icon:       string   // nome do ícone Lucide
  is_system:  boolean
  created_at: string
}

export interface IncomeSource {
  id:           string
  name:         string
  kind:         IncomeKind
  gross_cents:  Cents    // 0 = não informado
  net_cents:    Cents
  recurrence:   RecurrenceKind
  day_of_month: number
  active:       boolean
  created_at:   string
  updated_at:   string
}

export interface Expense {
  id:           string
  description:  string
  amount_cents: Cents
  kind:         ExpenseKind
  category_id:  string
  recurrence:   RecurrenceKind
  day_of_month: number
  active:       boolean
  created_at:   string
  updated_at:   string
}

export interface Debt {
  id:   string
  name: string
  kind: DebtKind

  // cartão de crédito
  limit_cents:           Cents
  current_balance_cents: Cents
  minimum_payment_cents: Cents
  closing_day:           number

  // empréstimo
  principal_cents:         Cents
  remaining_balance_cents: Cents
  monthly_payment_cents:   Cents
  total_installments:      number
  paid_installments:       number

  // comuns
  interest_rate_bps: number
  due_day:           number
  active:            boolean
  created_at:        string
  updated_at:        string
}

export interface InstallmentPlan {
  id:                       string
  description:              string
  debt_id:                  string
  category_id:              string
  total_cents:              Cents
  installment_amount_cents: Cents
  total_installments:       number
  paid_installments:        number
  first_due_date:           string   // YYYY-MM-DD
  active:                   boolean
  created_at:               string
  updated_at:               string
}

export interface Transaction {
  id:           string
  date:         string   // YYYY-MM-DD
  description:  string
  amount_cents: Cents
  direction:    Direction
  category_id:  string
  source_kind:  SourceKind
  source_id:    string
  note:         string
  created_at:   string
  updated_at:   string
}

// ── Summary ────────────────────────────────────────────────────────

export interface CategoryBreakdown {
  category_id:   string
  category_name: string
  total_cents:   Cents
  share_bps:     number   // 1% = 100 bps
}

export interface Summary {
  month:                       string   // YYYY-MM
  income_total_cents:          Cents
  fixed_expense_cents:         Cents
  variable_expense_cents:      Cents
  expense_total_cents:         Cents
  debt_commitment_cents:       Cents
  installment_commitment_cents: Cents
  balance_cents:               Cents
  by_category:                 CategoryBreakdown[]
}

// ── Respostas paginadas ────────────────────────────────────────────

export interface Pagination {
  page:  number
  limit: number
  total: number
}

export interface TransactionListResponse {
  items:      Transaction[]
  pagination: Pagination
}

// ── Erros da API ──────────────────────────────────────────────────

export interface ApiError {
  error: {
    code:    'VALIDATION_ERROR' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR'
    message: string
  }
}
```

### 6.2 Cliente HTTP (`src/lib/api.ts`)

```typescript
const BASE = '/api/v1'

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(
      body?.error?.code ?? 'INTERNAL_ERROR',
      body?.error?.message ?? `HTTP ${res.status}`,
      res.status
    )
  }

  // 204 No Content: sem body
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get:    <T>(path: string) => request<T>(path),
  post:   <T>(path: string, body: unknown) =>
            request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) =>
            request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
}
```

### 6.3 QueryClient (`src/lib/queryClient.ts`)

```typescript
import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            30_000,   // 30s: dados ficam frescos por 30s
      gcTime:               300_000,  // 5min: cache não usado é descartado
      retry: (count, err) =>
        !(err instanceof ApiError && err.status < 500) && count < 2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      onError: (err) => {
        if (err instanceof ApiError) {
          // toast global de erro (implementar com estado global simples)
          console.error(`[API] ${err.code}: ${err.message}`)
        }
      },
    },
  },
})
```

### 6.4 Query Keys — Convenções

```typescript
// Centralizar em src/lib/queryKeys.ts para evitar strings espalhadas
export const queryKeys = {
  summary:           (month: string) => ['summary', month],
  categories:        () => ['categories'],
  incomeSources:     (onlyActive: boolean) => ['income-sources', { onlyActive }],
  expenses:          (filter: object) => ['expenses', filter],
  debts:             (filter: object) => ['debts', filter],
  installmentPlans:  (onlyActive: boolean) => ['installment-plans', { onlyActive }],
  transactions:      (filter: object) => ['transactions', filter],
  transaction:       (id: string) => ['transactions', id],
} as const
```

### 6.5 Hooks de Exemplo (`src/hooks/use-summary.ts`)

```typescript
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { Summary } from '@/types/api'

export function useMonthSummary(month: string) {
  return useQuery({
    queryKey: queryKeys.summary(month),
    queryFn:  () => api.get<Summary>(`/summary?month=${month}`),
    enabled:  Boolean(month),
  })
}
```

```typescript
// src/hooks/use-categories.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type { Category } from '@/types/api'

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn:  () => api.get<Category[]>('/categories'),
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Category, 'id' | 'is_system' | 'created_at'>) =>
      api.post<Category>('/categories', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.categories() }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.categories() }),
  })
}
```

---

## 7. Roteamento

### src/app.tsx

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import PainelPage          from '@/pages/painel'
import ExtratoPage         from '@/pages/extrato'
import RendaPage           from '@/pages/renda'
import GastosPage          from '@/pages/gastos'
import DividasPage         from '@/pages/dividas'
import ConfiguracoesPage   from '@/pages/configuracoes'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/painel" replace />} />
        <Route path="/painel"          element={<PainelPage />} />
        <Route path="/extrato"         element={<ExtratoPage />} />
        <Route path="/renda"           element={<RendaPage />} />
        <Route path="/gastos"          element={<GastosPage />} />
        <Route path="/dividas"         element={<DividasPage />} />
        <Route path="/configuracoes"   element={<ConfiguracoesPage />} />
        <Route path="*" element={<Navigate to="/painel" replace />} />
      </Route>
    </Routes>
  )
}
```

### Tabela de Rotas

| Path | Página | Dados necessários |
|---|---|---|
| `/painel` | Dashboard | `GET /summary`, `GET /transactions?limit=5` |
| `/extrato` | Extrato | `GET /transactions` (paginado + filtros) |
| `/renda` | Fontes de Renda | `GET /income-sources` |
| `/gastos` | Gastos | `GET /expenses` |
| `/dividas` | Dívidas + Parcelamentos | `GET /debts`, `GET /installment-plans` |
| `/configuracoes` | Categorias | `GET /categories` |

---

## 8. Layout Principal

### 8.1 AppShell

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌─ sidebar ──┐  ┌─ main content ──────────────────────────────┐ │
│  │            │  │                                             │ │
│  │  Logo/Nome │  │  <PageHeader />                             │ │
│  │  ────────  │  │  ─────────────────────────────────────────  │ │
│  │  ⬡ Painel  │  │                                             │ │
│  │  📋 Extrato │  │  <Outlet />   ← página atual               │ │
│  │  💰 Renda   │  │                                             │ │
│  │  📊 Gastos  │  │                                             │ │
│  │  💳 Dívidas │  │                                             │ │
│  │            │  │                                             │ │
│  │  ─ bottom  │  │                                             │ │
│  │  ⚙ Config  │  │                                             │ │
│  └────────────┘  └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 8.2 Sidebar — Especificação

- **Largura:** `w-60` (240px). Sem colapso no MVP — a tela alvo é desktop.
- **Background:** `bg-ground-surface` com borda direita `border-r border-border`
- **Altura:** `h-screen`, `sticky top-0`, overflow hidden
- **Logo:** Nome "Assistente Financeiro" em Inter 600, menor; abaixo texto muted "Finanças pessoais"
- **Nav items:** ícone Lucide 18px + label, `rounded-lg`, hover `bg-brand-subtle text-brand`, active (rota atual) `bg-brand-subtle text-brand font-medium`
- **Configurações:** separado no rodapé da sidebar com `mt-auto`

```tsx
// Estrutura de dados dos nav items
const navItems = [
  { to: '/painel',        icon: LayoutDashboard, label: 'Painel'        },
  { to: '/extrato',       icon: ScrollText,      label: 'Extrato'       },
  { to: '/renda',         icon: TrendingUp,      label: 'Renda'         },
  { to: '/gastos',        icon: TrendingDown,    label: 'Gastos'        },
  { to: '/dividas',       icon: CreditCard,      label: 'Dívidas'       },
]
const bottomItems = [
  { to: '/configuracoes', icon: Settings2,        label: 'Configurações' },
]
```

### 8.3 PageHeader — Especificação

Props: `title`, `description?`, `action?` (botão de ação principal)

```
┌──────────────────────────────────────────────────────────┐
│  Painel                          [+ Lançamento]          │
│  Visão geral do mês                                      │
└──────────────────────────────────────────────────────────┘
```

---

## 9. Telas

### 9.1 Painel (Dashboard)

**Rota:** `/painel`  
**Propósito:** responder em 3 segundos: "como estou esse mês?"

#### Layout

```
┌─ PageHeader ────────────────────────────────────────────────────┐
│  Painel                                                         │
│  <MonthPicker value={month} onChange={setMonth} />              │
└─────────────────────────────────────────────────────────────────┘

┌─ SummaryCards (grid 4 colunas) ─────────────────────────────────┐
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────┐ │
│  │ Saldo        │ │ Renda        │ │ Gastos       │ │ Comprom│ │
│  │ R$ 1.080,00  │ │ R$ 5.000,00  │ │ R$ 2.750,00  │ │R$1.170 │ │
│  │ (teal/rose)  │ │ (teal)       │ │ (rose)       │ │ (rose) │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─ grid 2 colunas ────────────────────────────────────────────────┐
│  ┌── CategoryChart (col-span-1) ─┐  ┌── RecentTransactions ──┐ │
│  │  Donut chart Recharts         │  │  5 últimas transações   │ │
│  │  legenda embaixo              │  │  link "Ver todas →"     │ │
│  └───────────────────────────────┘  └───────────────────────-─┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### SummaryCards — Especificação

4 cards, todos com estrutura idêntica:

```
┌─────────────────────────────────┐
│  SALDO DO MÊS           [ícone] │  ← label em text-muted text-label
│  R$ 1.080,00                    │  ← MoneyDisplay em text-amount-xl
│  positivo/negativo (teal/rose)  │
│  fixos + variáveis − renda      │  ← subtitle em text-caption
└─────────────────────────────────┘
```

| Card | Valor | Cor | Subtítulo |
|---|---|---|---|
| Saldo do Mês | `balance_cents` | teal se ≥0, rose se <0 | "renda − comprometido" |
| Renda Total | `income_total_cents` | sempre teal | "no mês" |
| Total de Gastos | `expense_total_cents` | sempre rose | "fixos + variáveis" |
| Comprometido | `debt_commitment_cents + installment_commitment_cents` | sempre rose | "dívidas + parcelas" |

#### CategoryChart — Especificação

- **Componente Recharts:** `<PieChart>` com `<Pie dataKey="total_cents" innerRadius={60} outerRadius={90}>`
- Cada slice recebe a cor da categoria (`category.color` do backend)
- Tooltip: nome + valor em R$ + percentual (share_bps / 100)
- Legenda abaixo: `<CategoryBadge>` + valor + percentual
- Se `by_category` estiver vazio: `<EmptyState>` "Sem gastos categorizados no mês"

#### RecentTransactions — Especificação

- Busca `GET /transactions?limit=5` (sem filtro de mês — últimas 5 absoluto)
- Lista vertical de items: `[data] [descrição] [categoria] [valor]`
- Link "Ver todas no extrato →" no rodapé do card

---

### 9.2 Extrato

**Rota:** `/extrato`  
**Propósito:** visualizar, filtrar e gerenciar todos os lançamentos.

#### Layout

```
┌─ PageHeader ─────────────────────────────────────────────────────┐
│  Extrato                                     [+ Novo Lançamento] │
└──────────────────────────────────────────────────────────────────┘

┌─ TransactionFilters ─────────────────────────────────────────────┐
│  [De: ________] [Até: ________] [Categoria ▼] [Direção ▼]  [×] │
└──────────────────────────────────────────────────────────────────┘

┌─ TransactionTable ───────────────────────────────────────────────┐
│  Data ↕   Descrição          Categoria       Direção   Valor    │
│  ──────────────────────────────────────────────────────────────  │
│  15/06    Supermercado        🟢 Alimentação  Débito  -R$234,50  │
│  14/06    Salário CLT         —               Crédito +R$5.000   │
│  12/06    Nubank mínimo       —               Débito  -R$850     │
│  ··· (linhas paginadas)                                          │
└──────────────────────────────────────────────────────────────────┘

┌─ Pagination ─────────────────────────────────────────────────────┐
│  142 lançamentos               [← 1] [2] [3 →]                  │
└──────────────────────────────────────────────────────────────────┘
```

#### TransactionFilters — Estado local + URL params

Parâmetros de filtro sincronizados com `URLSearchParams` para que filtros sobrevivam ao refresh:

```typescript
interface TransactionFilters {
  from?:        string   // YYYY-MM-DD
  to?:          string   // YYYY-MM-DD
  category_id?: string
  direction?:   Direction
  page:         number   // default 1
  limit:        number   // default 50
}
```

- Botão "Limpar filtros" visível apenas quando há filtro ativo
- Filtros persistidos em query string da URL

#### TransactionTable — Colunas

| Coluna | Alinhamento | Notas |
|---|---|---|
| Data | centro | `formatDate(date, 'dd/MM')` em font-mono |
| Descrição | esquerda | truncate com ellipsis para >40 chars |
| Categoria | esquerda | `<CategoryBadge>` ou "—" se vazio |
| Valor | direita | `<MoneyDisplay>` em font-mono com sinal e cor |
| Ações | direita | ícones `<Pencil>` e `<Trash2>` visíveis no hover |

#### TransactionForm — Modal

Campos do formulário:

```
[Data *]             → input type="date"
[Descrição *]        → input text
[Valor em R$ *]      → input number (exibe R$; converte para centavos no submit)
[Direção *]          → Select: Crédito / Débito
[Categoria]          → Select de categorias (opcional para crédito)
[Observação]         → textarea opcional
```

Validação Zod:

```typescript
const transactionSchema = z.object({
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1, 'Descrição obrigatória'),
  amount_brl:  z.number().positive('Valor deve ser maior que zero'),
  direction:   z.enum(['credit', 'debit']),
  category_id: z.string().optional(),
  note:        z.string().optional(),
})
// No submit: amount_cents = Math.round(amount_brl * 100)
```

---

### 9.3 Renda

**Rota:** `/renda`  
**Propósito:** cadastrar e gerenciar fontes de renda (recorrentes e avulsas).

#### Layout

```
┌─ PageHeader ─────────────────────────────────────────────────────┐
│  Renda                                        [+ Nova Fonte]     │
└──────────────────────────────────────────────────────────────────┘

┌─ Renda Recorrente ───────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  💼 Salário CLT                                Recorrente    ││
│  │  Bruto R$ 6.000,00  →  Líquido R$ 5.000,00        Dia 5     ││
│  │  Mensal                           [Editar ✏] [Desativar ×]  ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘

┌─ Renda Avulsa ───────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────────┐│
│  │  ⚡ Freela Março 2026                          Avulso        ││
│  │  Líquido R$ 1.200,00                                         ││
│  │                                   [Editar ✏] [Desativar ×]  ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

#### IncomeCard — Especificação

- Header: ícone (Repeat para recorrente, Zap para avulso) + nome + badge de tipo
- Body: valores bruto/líquido. Se gross_cents == 0: mostrar apenas líquido
- Footer: recorrência + dia do mês (se recorrente) + botões de ação
- Desativada: card com `opacity-50`, badge "Inativa", sem botões de ação (só reativar se necessário — fora do MVP)

#### IncomeForm — Modal

```
[Nome da fonte *]           → input text
[Tipo *]                    → Radio: Recorrente / Avulsa
[Valor líquido (R$) *]      → input number
[Valor bruto (R$)]          → input number (opcional)
[Recorrência *]             → Select (se recorrente): Mensal / Semanal / Quinzenal
[Dia de recebimento *]      → input number 1-31 (se recorrente)
```

Validação: se tipo = "recorrente", recorrência e dia são obrigatórios.

---

### 9.4 Gastos

**Rota:** `/gastos`  
**Propósito:** gerenciar gastos fixos e variáveis.

#### Layout

```
┌─ PageHeader ─────────────────────────────────────────────────────┐
│  Gastos                                        [+ Novo Gasto]    │
└──────────────────────────────────────────────────────────────────┘

┌─ Tabs ───────────────────────────────────────────────────────────┐
│  [Fixos ●]  [Variáveis]                                          │
└──────────────────────────────────────────────────────────────────┘

┌─ Lista de Gastos ────────────────────────────────────────────────┐
│  Exibe lista de ExpenseCard para o tipo selecionado na tab       │
└──────────────────────────────────────────────────────────────────┘
```

#### ExpenseCard — Especificação

```
┌──────────────────────────────────────────────────────────────────┐
│  🔵 Aluguel                    Fixo · Moradia         Dia 10     │
│  R$ 1.200,00 / mês                       [Editar ✏] [Remover ×] │
└──────────────────────────────────────────────────────────────────┘
```

- Ícone da categoria (via `<CategoryIcon>`)
- Badge de tipo (Fixo / Variável)
- `<CategoryBadge>` com cor
- Dia de vencimento (se fixo)
- Valor com `<MoneyDisplay>`

#### ExpenseForm — Modal

```
[Descrição *]               → input text
[Valor (R$) *]              → input number
[Tipo *]                    → Radio: Fixo / Variável
[Categoria *]               → Select de categorias
[Dia de vencimento *]       → input number 1-31 (apenas se Fixo)
```

**Importante:** ao criar gasto Variável, o backend gera uma Transaction automaticamente. O frontend deve invalidar `queryKeys.transactions(...)` após a mutation de criar gasto variável.

---

### 9.5 Dívidas

**Rota:** `/dividas`  
**Propósito:** gerenciar cartões de crédito, empréstimos e parcelamentos ativos.

#### Layout

```
┌─ PageHeader ─────────────────────────────────────────────────────┐
│  Dívidas                                       [+ Nova Dívida]   │
└──────────────────────────────────────────────────────────────────┘

┌─ Tabs ───────────────────────────────────────────────────────────┐
│  [Cartões ●]  [Empréstimos]                                      │
└──────────────────────────────────────────────────────────────────┘

┌─ Lista de Dívidas ───────────────────────────────────────────────┐
│  Cards de dívidas (tipo selecionado na tab)                      │
└──────────────────────────────────────────────────────────────────┘

┌─ Separator ──────────────────────────────────────────────────────┐
│  Parcelamentos Ativos                   [+ Novo Parcelamento]    │
└──────────────────────────────────────────────────────────────────┘

┌─ InstallmentSection ─────────────────────────────────────────────┐
│  Cards de parcelamentos ativos (lista horizontal ou grid)        │
└──────────────────────────────────────────────────────────────────┘
```

#### DebtCard — Cartão de Crédito

```
┌──────────────────────────────────────────────────────────────────┐
│  💳 Nubank                                         Cartão        │
│  ─────────────────────────────────────────────────────────────── │
│  Limite R$ 5.000    Utilizado R$ 2.100   ██████░░░░ 42%          │
│  Mínimo R$ 210      Fecha dia 20   Vence dia 27                  │
│  Parcelamentos: 2 ativos                                         │
│                                          [Editar ✏] [Remover ×] │
└──────────────────────────────────────────────────────────────────┘
```

- Barra de progresso: `current_balance_cents / limit_cents * 100`
- Cor da barra: verde (<50%), amarelo (50-80%), vermelho (>80%)

#### DebtCard — Empréstimo

```
┌──────────────────────────────────────────────────────────────────┐
│  🏦 Empréstimo Pessoal                               Empréstimo  │
│  ─────────────────────────────────────────────────────────────── │
│  Principal R$ 15.000   Restante R$ 12.000   ██░░░░░░ 20% pago   │
│  Parcela R$ 960/mês   5 / 24 parcelas   Vence dia 10            │
│  Previsão de quitação: setembro 2027                             │
│                                          [Editar ✏] [Remover ×] │
└──────────────────────────────────────────────────────────────────┘
```

- Cálculo de quitação: `new Date(firstDueDate)` + `remaining_installments` meses
- Parcelas pagas/total como barra de progresso

#### InstallmentCard

```
┌──────────────────────────────────────────────────────────────────┐
│  📱 iPhone 15 · 12x de R$ 450,00                                 │
│  Pago: 3 / 12  ████░░░░░░░░ 25%       Nubank                    │
│  🟣 Eletrônicos                          [Pagar próxima ✓] [×] │
└──────────────────────────────────────────────────────────────────┘
```

- Botão "Pagar próxima" chama `PUT /installment-plans/{id}/pay`
- Após pagar todas: card desaparece da lista (soft deleted pelo backend)

#### DebtForm — Modal com tabs internas

```
[Tipo *]   → Radio: Cartão de Crédito / Empréstimo

── Campos Cartão ──────────────────────────────────
[Nome *]                    → input text
[Limite (R$) *]             → input number
[Saldo atual (R$)]          → input number
[Pagamento mínimo (R$)]     → input number
[Dia de fechamento *]       → input number 1-31
[Dia de vencimento *]       → input number 1-31
[Taxa de juros (% a.m.)]    → input number (converte para BPS: * 100)

── Campos Empréstimo ──────────────────────────────
[Nome *]                    → input text
[Valor principal (R$) *]    → input number
[Saldo devedor (R$)]        → input number
[Parcela mensal (R$) *]     → input number
[Total de parcelas *]       → input number
[Parcelas pagas]            → input number (default 0)
[Dia de vencimento *]       → input number 1-31
[Taxa de juros (% a.m.)]    → input number
```

#### InstallmentForm — Modal

```
[Dívida vinculada *]              → Select de dívidas ativas
[Descrição da compra *]           → input text
[Valor total (R$) *]              → input number
[Valor da parcela (R$) *]         → input number
[Número de parcelas *]            → input number
[Data da primeira parcela *]      → input date
[Categoria *]                     → Select de categorias
```

---

### 9.6 Configurações

**Rota:** `/configuracoes`  
**Propósito:** gerenciar categorias (as 8 do sistema + custom).

#### Layout

```
┌─ PageHeader ─────────────────────────────────────────────────────┐
│  Configurações                              [+ Nova Categoria]   │
└──────────────────────────────────────────────────────────────────┘

┌─ Seção: Categorias do Sistema ───────────────────────────────────┐
│  Grid 4 colunas de CategoryCards (is_system = true)              │
│  Sem botão de remover. Botão de editar nome/cor/ícone.           │
└──────────────────────────────────────────────────────────────────┘

┌─ Seção: Categorias Personalizadas ───────────────────────────────┐
│  Grid 4 colunas de CategoryCards (is_system = false)             │
│  Com botão de remover (só se sem dependências).                  │
│  Estado vazio: "Nenhuma categoria personalizada ainda."          │
└──────────────────────────────────────────────────────────────────┘
```

#### CategoryCard

```
┌─────────────────────┐
│  🏠                 │  ← ícone Lucide na cor da categoria
│  Moradia            │
│  #3B82F6            │
│            [✏] [×] │  ← × ausente se is_system
└─────────────────────┘
```

#### CategoryForm — Modal

```
[Nome *]          → input text
[Cor *]           → input type="color" (color picker nativo) + preview hex
[Ícone]           → input text (nome do ícone Lucide) com preview ao lado
```

Ao tentar deletar categoria com dependências: o backend retorna `409 CONFLICT` com `ErrHasDependencies`. O frontend exibe: "Esta categoria possui gastos ou lançamentos vinculados e não pode ser removida."

---

## 10. Componentes Compartilhados

### MoneyDisplay

```tsx
// Props
interface MoneyDisplayProps {
  cents:    number
  showSign?: boolean   // default: false
  colorize?: boolean   // default: true — positivo=teal, negativo=rose
  size?:    'sm' | 'md' | 'lg' | 'xl'  // default: 'md'
}

// Uso
<MoneyDisplay cents={-23450} showSign colorize />
// Renderiza: "-R$ 234,50" em rose, font-mono
```

Tamanhos mapeiam para `text-amount` (md), `text-amount-lg` (lg), `text-amount-xl` (xl).

### CategoryBadge

```tsx
interface CategoryBadgeProps {
  category: Category
  showIcon?: boolean  // default: true
}
// Renderiza: [bolinha colorida] [ícone?] Nome
```

### CategoryIcon

```tsx
interface CategoryIconProps {
  iconName: string   // ex: "home", "utensils"
  color:    string   // hex
  size?:    number   // default: 16
}
// Mapeia iconName → componente Lucide dinamicamente
// Fallback: <Circle> se nome não encontrado
```

### MonthPicker

```tsx
interface MonthPickerProps {
  value:    string               // YYYY-MM
  onChange: (v: string) => void
}
// Layout: [← chevron] "Junho 2026" [chevron →]
// Clique nas setas: avança/recua um mês
// Valor mínimo: 2020-01 (razoável para histórico)
// Valor máximo: mês atual + 1 (previsão)
```

### DataTable

```tsx
interface Column<T> {
  key:       keyof T | string
  header:    string
  align?:    'left' | 'center' | 'right'
  render?:   (row: T) => ReactNode
}

interface DataTableProps<T> {
  data:        T[]
  columns:     Column<T>[]
  onEdit?:     (row: T) => void
  onDelete?:   (row: T) => void
  loading?:    boolean
  emptyLabel?: string
}
```

### ConfirmDialog

```tsx
interface ConfirmDialogProps {
  open:         boolean
  onConfirm:    () => void
  onCancel:     () => void
  title:        string
  description:  string
  confirmLabel?: string   // default: "Remover"
  loading?:     boolean
}
// Usa @radix-ui/react-alert-dialog
// Botão de confirmação: variant="destructive" (rose)
```

### FormModal

```tsx
interface FormModalProps {
  open:     boolean
  onClose:  () => void
  title:    string
  children: ReactNode
  // Formulário fica dentro dos children com seu próprio submit
}
// Usa @radix-ui/react-dialog com foco no primeiro input ao abrir
```

### EmptyState

```tsx
interface EmptyStateProps {
  icon?:       LucideIcon    // default: PackageOpen
  title:       string
  description?: string
  action?:     { label: string; onClick: () => void }
}
```

### LoadingSkeleton

Shimmer animado. Variantes:

- `<SkeletonCard />` — skeleton de um card (para listas de income/expense/debt)
- `<SkeletonTable rows={5} />` — skeleton de tabela com N linhas
- `<SkeletonSummaryCards />` — 4 cards de dashboard

---

## 11. Formulários e Validação

### Padrão geral

```typescript
// Sempre usar react-hook-form + zod
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({ ... })
type FormData = z.infer<typeof schema>

function MyForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<FormData>({ resolver: zodResolver(schema) })
  const mutation = useCreateSomething()

  const onSubmit = form.handleSubmit(async (data) => {
    await mutation.mutateAsync(data)
    onSuccess()
  })

  return <form onSubmit={onSubmit}> ... </form>
}
```

### Conversão monetária

**Entrada:** usuário digita `234,50` ou `234.50` (aceitar ambos)  
**Armazenamento no form:** número em reais (float, só no form state)  
**Envio para API:** `Math.round(valor_brl * 100)` para obter centavos

```typescript
// Helper: parse do input monetário brasileiro
function parseBRL(input: string): number {
  return parseFloat(input.replace(/\./g, '').replace(',', '.')) || 0
}

// Schema com transformação
amount_brl: z.string()
  .transform(parseBRL)
  .pipe(z.number().positive('Valor deve ser maior que zero'))
```

### Feedback de erro

- Erros de campo: mensagem vermelha abaixo do input (react-hook-form `formState.errors`)
- Erros da API: toast global no canto inferior direito (implementar com estado em `queryClient`)

```typescript
// Padrão de error toast simples (sem biblioteca externa)
// src/lib/toast.ts — estado reativo simples
// Exibido em <Toaster /> no AppShell
```

---

## 12. Estados Especiais

### Loading

- **Dados principais de uma página:** skeleton full-page (ex: `<SkeletonSummaryCards />`)
- **Mutations (botões):** `loading={mutation.isPending}` no botão com spinner inline
- **Tabelas:** `<SkeletonTable />` sobre a área de dados enquanto refetch

### Erro

- **Erro de query:** `<ErrorMessage>` com botão "Tentar novamente" que chama `query.refetch()`
- **Erro de mutation:** toast global automático via `queryClient.defaultOptions.mutations.onError`
- **404 específico:** componente inline "Não encontrado" dentro da seção

```tsx
// Padrão para páginas
const { data, isLoading, isError, refetch } = useXxx()

if (isLoading) return <SkeletonXxx />
if (isError)   return <ErrorMessage onRetry={refetch} />
```

### Vazio

Cada lista tem seu estado vazio específico com CTA para adicionar:

| Tela | Ícone | Mensagem | CTA |
|---|---|---|---|
| Extrato vazio | `ScrollText` | "Nenhum lançamento encontrado" | "Registrar lançamento" |
| Renda vazia | `TrendingUp` | "Nenhuma fonte de renda cadastrada" | "Adicionar renda" |
| Gastos vazio | `TrendingDown` | "Nenhum gasto cadastrado" | "Adicionar gasto" |
| Dívidas vazia | `CreditCard` | "Nenhuma dívida cadastrada" | "Adicionar dívida" |
| Filtro sem resultados | `SearchX` | "Nenhum resultado para esses filtros" | "Limpar filtros" |

---

## 13. Utilitários de Formatação

### `src/lib/format.ts`

```typescript
import { format, parseISO, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ── Dinheiro ──────────────────────────────────────────────────────

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style:    'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

export function formatMoneyRaw(cents: number): string {
  // Sem símbolo de moeda — "1.234,56"
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function centsToFloat(cents: number): number {
  return cents / 100
}

export function floatToCents(value: number): number {
  return Math.round(value * 100)
}

// ── Datas ─────────────────────────────────────────────────────────

export function formatDate(isoDate: string, fmt = 'dd/MM/yyyy'): string {
  return format(parseISO(isoDate), fmt, { locale: ptBR })
}

export function formatMonth(yyyyMM: string): string {
  // "2026-06" → "Junho 2026"
  const [year, month] = yyyyMM.split('-')
  return format(new Date(Number(year), Number(month) - 1, 1), 'MMMM yyyy', { locale: ptBR })
}

export function currentMonth(): string {
  return format(new Date(), 'yyyy-MM')
}

export function prevMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-')
  return format(subMonths(new Date(Number(y), Number(m) - 1), 1), 'yyyy-MM')
}

export function nextMonth(yyyyMM: string): string {
  const [y, m] = yyyyMM.split('-')
  return format(addMonths(new Date(Number(y), Number(m) - 1), 1), 'yyyy-MM')
}

// ── Percentuais ────────────────────────────────────────────────────

export function formatBPS(bps: number): string {
  // basis points → percentual formatado: 4364 → "43,64%"
  return new Intl.NumberFormat('pt-BR', {
    style:                 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(bps / 10000)
}

// ── Ícones Lucide dinâmicos ────────────────────────────────────────

export function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
}
// "more-horizontal" → "MoreHorizontal"
// "trending-up"     → "TrendingUp"
```

---

## 14. Build e Integração com Go

### Desenvolvimento

```bash
# Terminal 1: backend Go
cd backend && go run ./cmd/server

# Terminal 2: frontend Vite (proxy /api → :8080)
cd frontend && npm run dev
```

O proxy no `vite.config.ts` redireciona `/api/*` para `http://127.0.0.1:8080`, sem CORS.

### Produção (binário único)

**1. Build do frontend:**

```bash
cd frontend && npm run build
# Gera: backend/static/  (configurado em vite.config.ts build.outDir)
```

**2. Servir via Go (`embed.FS`):**

Adicionar ao `backend/cmd/server/main.go`:

```go
import "embed"

//go:embed static
var staticFiles embed.FS

// No router, registrar handler de SPA APÓS as rotas /api:
// GET /* → serve static/index.html (client-side routing)
// GET /assets/* → serve arquivos estáticos com cache headers
```

**3. Roteamento SPA no Go:**

```go
// Handler que serve index.html para qualquer rota não-API
// (permite React Router funcionar com refresh de página)
func spaHandler(fs embed.FS) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Se path começa com /api: não deve chegar aqui (roteado antes)
        // Se path existe em static/: serve o arquivo
        // Caso contrário: serve static/index.html
    })
}
```

### Variáveis de ambiente

```bash
# .env.development (Vite)
VITE_API_BASE=/api/v1   # usado por api.ts; em dev o proxy redireciona
```

---

## 15. Critérios de Aceite

### Dashboard / Painel

- [ ] Ao entrar, exibe resumo do mês atual automaticamente
- [ ] MonthPicker navega entre meses; todos os dados atualizam
- [ ] Saldo positivo exibido em teal, negativo em rose
- [ ] Donut chart exibe categorias com cores do backend
- [ ] Lista de últimos lançamentos com link "Ver todas"
- [ ] Estado de loading: skeletons no lugar dos cards
- [ ] Estado de erro: mensagem com botão "Tentar novamente"
- [ ] Mês sem dados: cards zerados, chart com EmptyState

### Extrato

- [ ] Lista paginada de transações (50 por página padrão)
- [ ] Filtros por data, categoria e direção funcionam
- [ ] Filtros são refletidos na URL (reload mantém filtros)
- [ ] "Limpar filtros" visível apenas com filtro ativo
- [ ] Criar lançamento manual abre modal; fecha e invalida cache após sucesso
- [ ] Editar transação preenche form com dados atuais
- [ ] Deletar exibe ConfirmDialog antes de enviar DELETE
- [ ] Valores crédito (+) em teal, débito (−) em rose, font-mono

### Renda

- [ ] Lista fontes de renda ativas
- [ ] Criar, editar e desativar funcionam
- [ ] Se gross_cents == 0: exibe apenas líquido, sem campo "Bruto"
- [ ] Fonte recorrente exibe dia de recebimento

### Gastos

- [ ] Tabs Fixo / Variável filtram corretamente
- [ ] Criar gasto variável invalida também cache de transações
- [ ] Gasto fixo exibe dia de vencimento
- [ ] CategoryBadge usa cor real da categoria do banco

### Dívidas

- [ ] Tab Cartão mostra barra de utilização do limite
- [ ] Tab Empréstimo mostra progresso de parcelas + previsão de quitação
- [ ] Parcelamentos ativos aparecem na seção inferior
- [ ] "Pagar próxima parcela" chama endpoint correto e atualiza counter
- [ ] Tentar deletar dívida com parcelamentos ativos: exibe erro 409 da API

### Configurações

- [ ] Categorias do sistema sem botão de remover
- [ ] Tentar remover categoria com dependências: exibe mensagem do erro da API
- [ ] Color picker nativo com preview do hex

### Geral

- [ ] Todos os valores monetários em font-mono (`DM Mono`)
- [ ] Nenhum `float` usado para cálculo (apenas formatação via `formatMoney`)
- [ ] Formulários com validação Zod antes de enviar para API
- [ ] Erro de API (4xx/5xx) exibido como toast sem crashar a página
- [ ] `prefers-reduced-motion` desativa animações de entrada

---

*Spec criada em: 2026-06-23*  
*Próximo passo: `cd frontend && npm create vite@latest . -- --template react-ts && npm install`*
