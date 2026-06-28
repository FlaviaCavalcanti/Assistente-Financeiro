# Projeto Julius — Assistente Financeiro Pessoal

> Gestão financeira local-first, open source e com IA embutida. Seus dados ficam na sua máquina.

![Go](https://img.shields.io/badge/Go-1.25-00ADD8?style=flat-square&logo=go&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-pure%20Go-003B57?style=flat-square&logo=sqlite&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-local%20AI-black?style=flat-square)

---

## Sobre o projeto

O Projeto Julius é um assistente financeiro pessoal que vai além de registrar gastos. Ele entende a situação financeira, diagnostica problemas e ajuda a planejar metas — tudo rodando localmente, sem nuvem e sem assinatura.

**Julius** é o conselheiro embutido: um personagem com frases contextuais que aparecem com base na saúde financeira do mês. Não é um chatbot genérico — é personalidade com propósito.

### Princípios do projeto

- **Local-first** — SQLite na sua máquina; seus dados não saem daqui
- **Dinheiro nunca é `float`** — valores em `int64` (centavos); R$1,00 = 100
- **O LLM nunca calcula** — Ollama interpreta linguagem natural; o Go faz a aritmética
- **Um binário só** — build de produção embute o frontend via `embed.FS`
- **Single-user no MVP** — sem autenticação complexa; roda em `127.0.0.1`

---

## Funcionalidades

| Tela | O que faz |
|---|---|
| **Painel** | Visão mensal: saldo, renda, gastos, comprometimento; donut chart por categoria; Julius card |
| **Extrato** | Lista paginada de transações com filtros por data, categoria e direção |
| **Renda** | Cadastro de fontes de renda recorrentes (salário) e avulsas (freela) |
| **Gastos** | Gastos fixos e variáveis com categorias; gasto variável gera transação automaticamente |
| **Dívidas** | Cartões de crédito (utilização, limite) e empréstimos (progresso, previsão de quitação) + parcelamentos |
| **Diagnóstico** | Indicadores de saúde (verde/amarelo/vermelho), comprometimento de renda, projeção de quitação |
| **Metas** | Reserva de emergência e compras planejadas com barras de progresso e projeção automática |
| **Chat** | Assistente em linguagem natural via Ollama (100% offline, sem API key) |
| **Configurações** | Gestão de categorias com cor e ícone personalizados |

---

## Stack

### Backend

| Tecnologia | Versão | Papel |
|---|---|---|
| [Go](https://go.dev/) | 1.25 | Linguagem principal |
| [go-kit](https://github.com/go-kit/kit) | v0.13 | Monólito modular (middleware, transport) |
| [gorilla/mux](https://github.com/gorilla/mux) | v1.8 | Roteamento HTTP |
| [modernc.org/sqlite](https://pkg.go.dev/modernc.org/sqlite) | v1.53 | SQLite pure Go — zero CGO |
| [google/uuid](https://github.com/google/uuid) | v1.6 | PKs UUID string |

### Frontend

| Tecnologia | Versão | Papel |
|---|---|---|
| [React](https://react.dev/) | 18 | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | 6 | Type safety |
| [Vite](https://vite.dev/) | 8 | Build tool e dev server |
| [React Router](https://reactrouter.com/) | v7 | Roteamento client-side |
| [TanStack Query](https://tanstack.com/query) | v5 | Cache de servidor, mutations, refetch |
| [React Hook Form](https://react-hook-form.com/) | v7 | Formulários sem re-render desnecessário |
| [Zod](https://zod.dev/) | v3 | Validação e inferência de tipos |
| [Tailwind CSS](https://tailwindcss.com/) | v3 | Estilo utilitário |
| [Radix UI](https://www.radix-ui.com/) | v1/v2 | Primitivos acessíveis (WAI-ARIA) |
| [Recharts](https://recharts.org/) | v2 | Gráficos SVG declarativos |
| [Lucide React](https://lucide.dev/) | v0.4+ | Ícones (alinhados com o banco de dados) |
| [date-fns](https://date-fns.org/) | v3 | Manipulação de datas (pt-BR) |

### IA

| Tecnologia | Papel |
|---|---|
| [Ollama](https://ollama.com/) | Runtime LLM local |
| `qwen2.5:3b` | Modelo padrão (configurável via env) |

---

## Arquitetura do backend

```
backend/
├── entity/            # Domínio puro: structs, Validate(), Money (int64), BasisPoints, erros
├── repository/        # Interfaces de acesso a dados
│   └── sqlite/        # Implementação SQLite (SQL com placeholders, sem ORM)
│       └── migrations/# SQL executado automaticamente na inicialização
├── service/           # Lógica de negócio (nunca acessa HTTP nem SQL diretamente)
├── endpoint/          # go-kit endpoints: Request/Response structs
├── transport/http/    # gorilla/mux: decode/encode JSON, domain error → HTTP status
├── llm/               # Cliente Ollama isolado
└── cmd/server/        # Wire de todas as dependências; sem lógica de negócio
```

**Regra crítica:** lógica de negócio fica no `service/`; acesso ao banco fica no `repository/`. As camadas nunca se cruzam.

### Entidades do domínio

| Entidade | Notas |
|---|---|
| `Category` | `is_system` protege as 8 categorias padrão de deleção |
| `IncomeSource` | `recurring` ou `one_time`; soft delete via `active` |
| `Expense` | `fixed` ou `variable`; gasto variável gera `Transaction` automaticamente |
| `Debt` | `credit_card` ou `loan`; campos diferentes por tipo |
| `InstallmentPlan` | Entidade própria; ao quitar todas as parcelas, desativa automaticamente |
| `Transaction` | Ledger imutável; `direction`: `credit` ou `debit` |
| `Goal` | `emergency_fund` ou `purchase`; contribuições acumulam em `current_cents` |
| `Summary` | Não persistido — calculado sob demanda por mês |

### Convenções técnicas

```
Dinheiro   → entity.Money     (int64, centavos)  R$1,00 = 100
Taxas      → entity.BasisPoints (int64, bps)     1% = 100 bps
IDs        → UUID string (github.com/google/uuid)
Soft delete → UPDATE SET active=0 (não DELETE)
Datas      → TEXT no SQLite: "YYYY-MM-DD" ou "YYYY-MM-DDTHH:MM:SSZ"
```

---

## Como executar

### Pré-requisitos

- [Go 1.25+](https://go.dev/dl/)
- [Node.js 20+](https://nodejs.org/) + npm
- [Ollama](https://ollama.com/) (opcional — necessário apenas para o chat)

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/Assistente-Financeiro.git
cd Assistente-Financeiro
```

### 2. Backend (porta 8080)

```bash
cd backend
go run ./cmd/server
```

O banco SQLite é criado automaticamente em `./data/finance.db` na primeira execução. As migrations rodam sozinhas.

### 3. Frontend — modo desenvolvimento (porta 5173)

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Acesse em `http://localhost:5173`. O Vite faz proxy de `/api/*` para o backend em `:8080` — sem CORS.

### 4. Chat com IA (opcional)

Instale o Ollama e baixe o modelo:

```bash
# Instale em ollama.com, depois:
ollama pull qwen2.5:3b
```

O backend detecta o Ollama automaticamente ao iniciar. Se não estiver disponível, o chat exibe um aviso mas o resto do app funciona normalmente.

---

## Build de produção

O frontend é compilado e embutido no binário Go via `embed.FS` — **um único executável serve tudo**.

```bash
# 1. Build do frontend (gera backend/static/)
cd frontend
npm run build

# 2. Compilar e executar o binário
cd ../backend
go run ./cmd/server
# ou compilar: go build -o julius ./cmd/server && ./julius
```

Acesse em `http://localhost:8080`.

---

## Variáveis de ambiente

Todas opcionais — o backend funciona com os valores padrão.

| Variável | Padrão | Descrição |
|---|---|---|
| `DB_PATH` | `./data/finance.db` | Caminho do banco SQLite |
| `PORT` | `8080` | Porta HTTP do servidor |
| `OLLAMA_URL` | `http://localhost:11434` | URL do Ollama |
| `OLLAMA_MODEL` | `qwen2.5:3b` | Modelo LLM a usar |

Exemplo com variáveis customizadas:

```bash
DB_PATH=/mnt/dados/julius.db PORT=9090 go run ./cmd/server
```

---

## Migrations do banco

Executadas automaticamente na inicialização, em ordem:

| Arquivo | O que faz |
|---|---|
| `001_initial.sql` | Schema completo de todas as tabelas |
| `002_seed_categories.sql` | 8 categorias padrão do sistema |
| `003_income_source_months.sql` | Adiciona `first_month`/`last_month` às fontes de renda |
| `004_installment_no_card.sql` | Remove FK de `installment_plan` para `debt` |
| `005_goals.sql` | Tabela de metas e contribuições |

---

## API

Base: `http://127.0.0.1:8080/api/v1`

| Recurso | Prefixo | Operações |
|---|---|---|
| Categorias | `/categories` | `GET` `POST` `PUT /{id}` `DELETE /{id}` |
| Fontes de renda | `/income-sources` | `GET ?active=` `POST` `PUT /{id}` `DELETE /{id}` |
| Gastos | `/expenses` | `GET ?active=&kind=` `POST` `PUT /{id}` `DELETE /{id}` |
| Dívidas | `/debts` | `GET ?active=&kind=` `POST` `PUT /{id}` `DELETE /{id}` |
| Parcelamentos | `/installment-plans` | `GET` `POST` `PUT /{id}` `DELETE /{id}` `PUT /{id}/pay` |
| Transações | `/transactions` | `GET ?from=&to=&category_id=&direction=&page=&limit=` `POST` `PUT /{id}` `DELETE /{id}` |
| Resumo mensal | `/summary` | `GET ?month=YYYY-MM` |
| Metas | `/goals` | `GET` `POST` `PUT /{id}` `DELETE /{id}` `POST /{id}/contribute` |
| Chat | `/chat/status` `chat/message` | `GET` status do Ollama · `POST` enviar mensagem |

**Formato de erro:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "recurso não encontrado"
  }
}
```

**Valores monetários:** sempre em centavos (`int64`). R$1,00 = `100`. Nunca `float`.

---

## Estrutura do projeto

```
Assistente-Financeiro/
├── backend/
│   ├── cmd/server/         # Entrypoint + wire de dependências
│   ├── entity/             # Domínio puro
│   ├── repository/
│   │   └── sqlite/
│   │       └── migrations/ # Arquivos SQL de migração
│   ├── service/            # Lógica de negócio
│   ├── endpoint/           # go-kit endpoints
│   ├── transport/http/     # Handlers HTTP + roteador
│   ├── llm/                # Cliente Ollama
│   └── data/               # banco.db (gitignored)
│
├── frontend/
│   └── src/
│       ├── app.tsx          # Rotas raiz
│       ├── components/
│       │   ├── layout/      # AppShell, Sidebar, PageHeader
│       │   └── ui/          # Primitivos Radix (Button, Dialog, Select…)
│       ├── hooks/           # TanStack Query — um arquivo por domínio
│       ├── lib/             # api.ts, format.ts, queryClient.ts
│       ├── pages/           # Uma pasta por rota
│       └── types/api.ts     # Tipos TypeScript espelhando o backend
│
├── docs/
│   ├── checkpoint-assistente-financeiro.md
│   ├── spec.md
│   ├── spec-frontend.md
│   └── guia-do-projeto.md
│
├── CLAUDE.md               # Instruções para Claude Code
└── README.md
```

---

## Contribuindo

Contribuições são bem-vindas! Para começar:

1. Faça um fork do repositório
2. Crie uma branch: `git checkout -b feat/minha-feature`
3. Commit: `git commit -m "feat: descrição da mudança"`
4. Push: `git push origin feat/minha-feature`
5. Abra um Pull Request

### Guias de contribuição

- Dinheiro: sempre `entity.Money` (int64 centavos) — nunca `float64`
- Juros/taxas: sempre `entity.BasisPoints` (int64) — 1% = 100
- Lógica de negócio: somente no `service/` — nunca no transport
- Acesso ao banco: somente no `repository/` — nunca no service
- Novos endpoints: seguir o padrão `endpoint/ → transport/http/`

---

## Roadmap

- [x] Fase 1 — MVP: renda, gastos, dívidas, extrato, painel
- [x] Fase 2 — Diagnóstico: percentuais, comprometimento, projeções
- [x] Fase 3 — Metas: reserva de emergência, compras planejadas
- [x] Fase 4 — Chat: assistente em linguagem natural via Ollama
- [ ] Streaming SSE para o chat (respostas em tempo real)
- [ ] Motor de regras de insights configurável pelo usuário
- [ ] Entrada por linguagem natural para criar transações via chat
- [ ] Exportação de dados (CSV / JSON)
- [ ] Tema claro opcional

---


## Autora

**Flávia Mayara Da Silva Cavalcanti**

[![GitHub](https://img.shields.io/badge/GitHub-Flavia--Cavalcanti-181717?style=flat-square&logo=github)](https://github.com/FlaviaCavalcanti)

---

<p align="center">
  Feito com Go, React e SQLite por <strong>Flávia Mayara Da Silva Cavalcanti</strong> · <strong>Projeto Julius</strong>
</p>
