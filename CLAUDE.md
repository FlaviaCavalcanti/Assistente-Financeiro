# Assistente Financeiro — Guia para Claude Code

Aplicação local-first de gestão de finanças pessoais. Tudo roda na máquina do usuário: sem cloud, sem APIs externas pagas.

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Go 1.25 + go-kit + gorilla/mux |
| Banco | SQLite (modernc.org/sqlite — pure Go, sem CGO) |
| LLM | Ollama local (`http://localhost:11434`, modelo `qwen2.5:3b`) |
| Frontend | React 18 + Vite + TypeScript |
| Estilo | Tailwind CSS + Radix UI |
| Dados | TanStack Query v5 + React Hook Form + Zod |
| Roteamento | React Router v7 |

## Como rodar

```bash
# Backend (porta 8080)
cd backend
go run ./cmd/server

# Frontend dev (porta 5173, proxy → 8080)
cd frontend
npm install
npm run dev

# Build de produção (compila para backend/static/, Go serve como estático)
cd frontend
npm run build
```

## Variáveis de ambiente (backend)

| Variável | Padrão | Descrição |
|---|---|---|
| `DB_PATH` | `./data/finance.db` | Caminho do banco SQLite |
| `PORT` | `8080` | Porta HTTP do servidor |
| `OLLAMA_URL` | `http://localhost:11434` | URL do Ollama |
| `OLLAMA_MODEL` | `qwen2.5:3b` | Modelo LLM a usar |

## Arquitetura do backend (5 camadas)

```
entity/          → Domínio puro: structs, Validate(), tipos Money e BasisPoints, erros
repository/      → Interfaces de acesso a dados
repository/sqlite/ → Implementação SQLite (SQL com placeholders, sem ORM)
service/         → Lógica de negócio (NUNCA acessa HTTP nem SQL diretamente)
endpoint/        → go-kit endpoints: Request/Response structs, erros dentro do Response.Err
transport/http/  → gorilla/mux: decode/encode JSON, domain error → HTTP status, logging
llm/             → Cliente Ollama isolado (não vaza para outras camadas)
cmd/server/      → Wire de todas as dependências, sem lógica de negócio
```

**Regra crítica:** nunca misture lógica de negócio no transport, nem acesso ao banco no service.

## Entidades

| Entidade | Arquivo | Notas |
|---|---|---|
| `Category` | `entity/category.go` | IsSystem protege categorias padrão de deleção |
| `IncomeSource` | `entity/income_source.go` | recurring ou one_time, soft delete |
| `Expense` | `entity/expense.go` | fixed ou variable; variable gera Transaction automaticamente |
| `Debt` | `entity/debt.go` | credit_card ou loan; campos diferentes por tipo |
| `InstallmentPlan` | `entity/installment_plan.go` | ao quitar todas as parcelas, desativa automaticamente |
| `Transaction` | `entity/transaction.go` | ledger imutável; direction: credit ou debit |
| `Goal` | `entity/goal.go` | emergency_fund ou purchase; contribuições acumulam |
| `Summary` | `entity/summary.go` | não persistido, calculado sob demanda |

## Convenções de código

**Dinheiro:** sempre `entity.Money` (int64 em centavos). Nunca `float64`. R$1,00 = 100.

**Porcentagem:** sempre `entity.BasisPoints` (int64). 1% = 100. Juros 2,5%/mês = 250 bps.

**IDs:** UUID string gerado com `github.com/google/uuid`. PKs são `TEXT` no SQLite.

**Soft delete:** entidades com `Active bool` usam `UPDATE SET active=0` em vez de DELETE. Exceção: `Transaction` é deletada de verdade.

**Datas no banco:** armazenadas como `TEXT` no formato `YYYY-MM-DD` ou `YYYY-MM-DDTHH:MM:SSZ`.

**Erros de domínio:** definidos em `entity/errors.go`, mapeados para HTTP status em `transport/http/errors.go`.

**Paginação:** parâmetros `page` (base 1) e `limit` (padrão 50, máx recomendado 200).

## Migrations do banco

Arquivos em `backend/repository/sqlite/migrations/`, executados automaticamente na inicialização:

- `001_initial.sql` — schema completo de todas as tabelas
- `002_seed_categories.sql` — 8 categorias padrão (sistema)
- `003_income_source_months.sql` — adiciona first_month/last_month
- `004_installment_no_card.sql` — remove FK de installment_plan para debt
- `005_goals.sql` — tabela de metas e contribuições

## Endpoints da API

Base: `http://127.0.0.1:8080/api/v1`

| Recurso | Prefixo | Operações |
|---|---|---|
| Categorias | `/categories` | CRUD completo |
| Fontes de renda | `/income-sources` | CRUD + filtro `active` |
| Gastos | `/expenses` | CRUD + filtro `active`, `kind` |
| Dívidas | `/debts` | CRUD + filtro `active`, `kind` |
| Parcelamentos | `/installment-plans` | CRUD + `PUT /{id}/pay` |
| Transações | `/transactions` | CRUD + filtros `from`, `to`, `category_id`, `direction`, paginação |
| Resumo | `/summary` | `GET ?month=YYYY-MM` |
| Metas | `/goals` | CRUD + `POST /{id}/contribute` |
| Chat | `/chat/status`, `/chat/message` | status Ollama + enviar mensagem |

## Frontend — páginas

| Rota | Página | Descrição |
|---|---|---|
| `/painel` | Painel | Dashboard com summary cards, gráfico por categoria, transações recentes |
| `/extrato` | Extrato | Lista de transações com filtros e criação manual |
| `/renda` | Renda | Fontes de renda (CRUD) |
| `/gastos` | Gastos | Gastos fixos e variáveis (CRUD) |
| `/dividas` | Dívidas | Dívidas e parcelamentos (CRUD) |
| `/diagnostico` | Diagnóstico | Análise de saúde financeira com gráficos |
| `/metas` | Metas | Metas financeiras com contribuições |
| `/chat` | Chat | Assistente em linguagem natural (requer Ollama) |
| `/configuracoes` | Configurações | Gestão de categorias |

## Estrutura do frontend

```
src/
  app.tsx          → Router raiz (React Router v7)
  main.tsx         → Entry point (QueryClientProvider + BrowserRouter + ErrorBoundary)
  index.css        → Tailwind directives + base styles
  components/
    layout/        → AppShell, Sidebar, PageHeader
    ui/            → Primitivos Radix (Button, Dialog, Select, etc.)
  hooks/           → Um arquivo por recurso (use-expenses.ts, use-chat.ts, etc.)
  lib/
    api.ts         → fetch wrapper centralizado
    queryClient.ts → TanStack Query config
    queryKeys.ts   → Chaves de cache tipadas
    format.ts      → formatMoney, formatDate, etc.
  pages/           → Uma pasta por rota, index.tsx + forms
  types/api.ts     → Tipos TypeScript dos responses da API
```

## Observações importantes

- O projeto **não usa a API do Claude** em runtime. O chat usa Ollama local (gratuito, offline).
- Fontes: Tailwind usa `font-sans` → `system-ui, -apple-system, sans-serif` como fallback. Não há dependência de CDN de fontes.
- O build do frontend vai para `backend/static/` (configurado no `vite.config.ts`). Essa pasta está no `.gitignore`.
- O banco SQLite também está no `.gitignore` — não versionar dados pessoais.
