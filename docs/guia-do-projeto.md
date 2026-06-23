# Guia Completo do Projeto — Assistente Financeiro (Backend)

> Este documento explica **tudo** que está implementado: arquitetura, camadas, fluxo de dados, cada rota e como testar. Leia do início ao fim para entender 100% do projeto.

---

## Índice

1. [O que foi construído](#1-o-que-foi-construído)
2. [Como rodar o projeto](#2-como-rodar-o-projeto)
3. [Arquitetura em camadas](#3-arquitetura-em-camadas)
4. [Camada Entity](#4-camada-entity)
5. [Camada Repository](#5-camada-repository)
6. [Camada Service](#6-camada-service)
7. [Camada Endpoint](#7-camada-endpoint)
8. [Camada Transport](#8-camada-transport)
9. [Fluxo completo de uma requisição](#9-fluxo-completo-de-uma-requisição)
10. [Banco de dados SQLite](#10-banco-de-dados-sqlite)
11. [Cada rota explicada](#11-cada-rota-explicada)
12. [Como testar tudo passo a passo](#12-como-testar-tudo-passo-a-passo)
13. [Regras de negócio implementadas](#13-regras-de-negócio-implementadas)
14. [Erros e validações](#14-erros-e-validações)

---

## 1. O que foi construído

Um **backend HTTP em Go** que expõe uma API JSON para um assistente financeiro pessoal. Tudo roda localmente na máquina — sem nuvem, sem serviço externo.

### Estrutura de arquivos

```
backend/
├── cmd/server/main.go              ← ponto de entrada; conecta tudo
│
├── entity/                         ← CAMADA 1: tipos de domínio
│   ├── money.go                    ← tipo Money (int64 em centavos)
│   ├── errors.go                   ← erros de domínio (ErrNotFound, etc.)
│   ├── category.go                 ← entidade Categoria
│   ├── income_source.go            ← entidade Fonte de Renda
│   ├── expense.go                  ← entidade Gasto
│   ├── debt.go                     ← entidade Dívida
│   ├── installment_plan.go         ← entidade Parcelamento
│   ├── transaction.go              ← entidade Lançamento/Extrato
│   └── summary.go                  ← resultado calculado do resumo mensal
│
├── repository/                     ← CAMADA 2: acesso a dados
│   ├── interfaces.go               ← contratos (interfaces) de repositório
│   └── sqlite/                     ← implementação concreta com SQLite
│       ├── db.go                   ← conexão, migrações
│       ├── time.go                 ← parser de datas do SQLite
│       ├── helpers.go              ← funções utilitárias (bool↔int, etc.)
│       ├── category.go
│       ├── income_source.go
│       ├── expense.go
│       ├── debt.go
│       ├── installment_plan.go
│       ├── transaction.go
│       └── migrations/             ← arquivos SQL executados no boot
│           ├── 001_initial.sql     ← cria todas as tabelas
│           └── 002_seed_categories.sql ← insere as 8 categorias padrão
│
├── service/                        ← CAMADA 3: regras de negócio
│   ├── interfaces.go               ← contratos e input structs dos serviços
│   ├── helpers.go                  ← gerador de UUID
│   ├── category.go
│   ├── income_source.go
│   ├── expense.go                  ← aqui mora a regra: variável → Transaction
│   ├── debt.go
│   ├── installment_plan.go
│   ├── transaction.go
│   └── summary.go                  ← cálculo do saldo mensal (aritmética em Go)
│
├── endpoint/                       ← CAMADA 4: adaptadores go-kit
│   ├── category.go
│   ├── income_source.go
│   ├── expense.go
│   ├── debt.go
│   ├── installment_plan.go
│   ├── transaction.go
│   └── summary.go
│
└── transport/http/                 ← CAMADA 5: HTTP com gorilla/mux
    ├── router.go                   ← registra todas as rotas
    ├── middleware.go               ← log de cada request
    ├── errors.go                   ← traduz erros de domínio → HTTP status
    ├── helpers.go                  ← decoders genéricos (ID do path, etc.)
    ├── category.go
    ├── income_source.go
    ├── expense.go
    ├── debt.go
    ├── installment_plan.go
    ├── transaction.go
    └── summary.go
```

---

## 2. Como rodar o projeto

### Pré-requisitos

- Go 1.22 ou superior instalado
- Sem nenhuma outra dependência (SQLite é embutido no binário via `modernc.org/sqlite`)

### Rodar em desenvolvimento

```bash
cd backend
go run ./cmd/server
```

### Variáveis de ambiente (opcionais)

```bash
PORT=8080          # porta do servidor (padrão: 8080)
DB_PATH=./data/finance.db  # caminho do banco SQLite (padrão: ./data/finance.db)
LOG_LEVEL=info     # nível de log (padrão: info)
```

### O que acontece no boot

1. Cria a pasta `./data/` se não existir.
2. Abre (ou cria) o arquivo `finance.db`.
3. Executa as migrations SQL em ordem alfabética:
   - `001_initial.sql` → cria todas as tabelas.
   - `002_seed_categories.sql` → insere as 8 categorias padrão (usa `INSERT OR IGNORE`, então não duplica).
4. Liga todas as camadas (repository → service → endpoint → transport).
5. Sobe o servidor HTTP em `127.0.0.1:8080`.

> **Atenção:** o servidor só aceita conexões de `localhost`. Ele nunca escuta em `0.0.0.0`.

---

## 3. Arquitetura em camadas

O projeto usa uma arquitetura limpa com 5 camadas. A regra principal é:

> **Camadas superiores dependem de camadas inferiores apenas via interfaces. Nunca ao contrário.**

```
┌─────────────────────────────────────────────┐
│              cmd/server/main.go             │  ← instancia e conecta tudo
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │   transport/http/   │  ← recebe HTTP, decodifica, chama endpoint
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │     endpoint/       │  ← adapta método de serviço para go-kit
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │      service/       │  ← regra de negócio, orquestra repositórios
        └──────────┬──────────┘
                   │ (via interface)
        ┌──────────▼──────────┐
        │    repository/      │  ← interface de acesso a dados
        │    sqlite/          │  ← implementação concreta com SQLite
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │      entity/        │  ← structs, tipos, erros (sem dependências)
        └─────────────────────┘
```

### Por que usar interfaces entre camadas?

Se o `service` chamar o `repository` diretamente (sem interface), ele fica acoplado ao SQLite. Com interfaces:

- O service conhece apenas o **contrato** (`IncomeSourceRepository`), não o SQLite.
- Trocar SQLite por PostgreSQL no futuro = só criar nova implementação, sem tocar no service.
- Testar o service = criar um repositório falso (mock) que implementa a interface.

---

## 4. Camada Entity

**Pasta:** `entity/`

É o coração do sistema. Não importa nada interno do projeto — só pacotes da biblioteca padrão do Go.

### 4.1 Money (centavos)

```go
// entity/money.go
type Money int64
```

**Por que `int64` e não `float64`?**

Float tem imprecisão binária. `0.1 + 0.2` em float não é exatamente `0.3`. Para dinheiro, isso é inaceitável. Usando `int64` em centavos:

- R$ 5.000,00 → `500000` (int64)
- R$ 120,50  → `12050` (int64)
- Nunca há erro de arredondamento.

A conversão para "R$ X,XX" acontece **apenas na camada de apresentação** (futuramente no frontend).

### 4.2 BasisPoints (percentuais)

```go
type BasisPoints int64
// 1% = 100 bps
// 15,90% = 1590 bps
```

Mesmo raciocínio do Money: evitar float em cálculos de juros.

### 4.3 Erros de domínio

```go
// entity/errors.go
var (
    ErrNotFound        = errors.New("not found")
    ErrInvalidMoney    = errors.New("valor monetário deve ser maior que zero")
    ErrInvalidDay      = errors.New("dia deve estar entre 1 e 31")
    ErrConflict        = errors.New("operação viola uma regra de negócio")
    ErrSystemCategory  = errors.New("categorias do sistema não podem ser removidas")
    ErrHasDependencies = errors.New("entidade possui dependências ativas")
)
```

Esses erros são definidos aqui e reconhecidos lá na camada `transport/http/errors.go`, que os traduz para o HTTP status code correto. Isso é o **mapa de erros** do sistema.

### 4.4 Entidades e seus métodos Validate()

Cada entidade tem um método `Validate()` que verifica suas invariantes antes de salvar:

```go
// exemplo: entity/income_source.go
func (i IncomeSource) Validate() error {
    if !i.NetCents.IsValid() {           // net_cents deve ser > 0
        return ErrInvalidMoney
    }
    if i.Kind == IncomeKindRecurring &&
       (i.DayOfMonth < 1 || i.DayOfMonth > 31) {  // renda recorrente precisa de dia
        return ErrInvalidDay
    }
    if i.GrossCents > 0 && i.GrossCents < i.NetCents {  // bruto >= líquido
        return errors.New("gross_cents deve ser maior ou igual a net_cents")
    }
    return nil
}
```

`Validate()` é chamado **no service**, antes de persistir. O transport nunca valida — só decodifica JSON.

---

## 5. Camada Repository

**Pasta:** `repository/`

Define **o que** pode ser feito com os dados, sem dizer **como**.

### 5.1 Interfaces (o contrato)

```go
// repository/interfaces.go
type IncomeSourceRepository interface {
    FindAll(ctx context.Context, onlyActive bool) ([]entity.IncomeSource, error)
    FindByID(ctx context.Context, id string) (entity.IncomeSource, error)
    Create(ctx context.Context, s entity.IncomeSource) error
    Update(ctx context.Context, s entity.IncomeSource) error
    Deactivate(ctx context.Context, id string) error
}
```

O service não sabe que existe SQLite. Ele só sabe que existe algo que implementa `IncomeSourceRepository`.

### 5.2 Implementação SQLite

**Pasta:** `repository/sqlite/`

Cada arquivo implementa a interface correspondente. Exemplo simplificado:

```go
// repository/sqlite/income_source.go
func (r *incomeSourceRepository) FindByID(ctx context.Context, id string) (entity.IncomeSource, error) {
    row := r.db.Conn.QueryRowContext(ctx,
        `SELECT id, name, kind, ... FROM income_sources WHERE id = ?`, id)
    //                                                               ↑
    //                          placeholder ? previne SQL injection
    s, err := scanIncomeSource(row)
    if errors.Is(err, sql.ErrNoRows) {
        return entity.IncomeSource{}, entity.ErrNotFound  // traduz erro do banco para erro de domínio
    }
    return s, err
}
```

### 5.3 Migrations

**Pasta:** `repository/sqlite/migrations/`

Arquivos SQL executados em ordem no boot. Usam `//go:embed` para serem embutidos no binário — o banco é inicializado automaticamente, sem precisar rodar SQL manualmente.

```
001_initial.sql     → CREATE TABLE categories, income_sources, expenses, debts, ...
002_seed_categories.sql → INSERT OR IGNORE INTO categories (8 categorias padrão)
```

O `INSERT OR IGNORE` garante que se o servidor reiniciar, as categorias não duplicam.

---

## 6. Camada Service

**Pasta:** `service/`

Aqui ficam as **regras de negócio**. É a camada mais importante. O service:
- Recebe um `Input struct` (dado bruto da requisição).
- Valida via `entity.Validate()`.
- Chama o repository.
- Toma decisões de negócio.

### 6.1 Exemplo: criar gasto variável gera lançamento automático

```go
// service/expense.go
func (s *expenseService) Create(ctx context.Context, input CreateExpenseInput) (entity.Expense, error) {
    // 1. Monta a entidade
    e := entity.Expense{
        ID:          newID(),      // gera UUID v4
        Description: input.Description,
        AmountCents: input.AmountCents,
        Kind:        input.Kind,
        // ...
    }

    // 2. Valida invariantes de domínio
    if err := e.Validate(); err != nil {
        return entity.Expense{}, err  // retorna erro ANTES de tocar no banco
    }

    // 3. Persiste o gasto
    if err := s.repo.Create(ctx, e); err != nil {
        return entity.Expense{}, err
    }

    // 4. REGRA: gasto variável gera Transaction automaticamente
    if input.Kind == entity.ExpenseKindVariable {
        tx := entity.Transaction{
            ID:          newID(),
            Date:        time.Now().UTC(),
            Description: input.Description,
            AmountCents: input.AmountCents,
            Direction:   entity.DirectionDebit,   // é uma saída de dinheiro
            CategoryID:  input.CategoryID,
            SourceKind:  entity.SourceKindExpense, // de onde veio
            SourceID:    e.ID,                     // qual gasto gerou
        }
        s.transaction.Create(ctx, tx)
    }
    // Gasto FIXO não gera lançamento automático —
    // o usuário confirma quando o débito efetivamente ocorreu.

    return e, nil
}
```

### 6.2 Summary Service — o cálculo central

```go
// service/summary.go
func (s *summaryService) GetMonthly(ctx context.Context, month string) (entity.Summary, error) {
    // Converte "2026-06" em intervalo de datas: 2026-06-01 até 2026-06-30
    from := time.Date(year, time.Month(m), 1, 0, 0, 0, 0, time.UTC)
    to   := from.AddDate(0, 1, -1)

    // 1. Soma net_cents de todas as fontes de renda recorrentes ativas
    sources, _ := s.incomeRepo.FindAll(ctx, true)
    var incomeTotal entity.Money
    for _, src := range sources {
        if src.Kind == entity.IncomeKindRecurring {
            incomeTotal = incomeTotal.Add(src.NetCents)
        }
    }

    // 2. Busca créditos avulsos do mês (renda extra lançada manualmente)
    extraIncome, _ := s.transactionRepo.SumByDirection(ctx, entity.DirectionCredit, from, to)
    incomeTotal = incomeTotal.Add(extraIncome)

    // 3. Soma gastos fixos ativos
    fixedExpenses, _ := s.expenseRepo.FindAll(ctx, repository.ExpenseFilter{Kind: &fixedKind, OnlyActive: true})
    var fixedTotal entity.Money
    for _, e := range fixedExpenses {
        fixedTotal = fixedTotal.Add(e.AmountCents)
    }

    // 4. Soma débitos do mês nas transações (gastos variáveis efetivados)
    variableTotal, _ := s.transactionRepo.SumByDirection(ctx, entity.DirectionDebit, from, to)

    // 5. Soma compromisso mensal de dívidas (mínimo do cartão + parcela do empréstimo)
    debts, _ := s.debtRepo.FindAll(ctx, repository.DebtFilter{OnlyActive: true})
    var debtCommitment entity.Money
    for _, d := range debts {
        debtCommitment = debtCommitment.Add(d.MonthlyCommitment())
    }

    // 6. Soma parcelas com vencimento no mês
    plans, _ := s.installmentRepo.FindActiveDueInMonth(ctx, year, m)
    var installmentCommitment entity.Money
    for _, p := range plans {
        installmentCommitment = installmentCommitment.Add(p.InstallmentAmountCents)
    }

    // 7. Calcula o saldo — ARITMÉTICA EM GO, NUNCA NO BANCO
    balance := entity.Money(
        incomeTotal.Int64() -
        fixedTotal.Int64() -
        variableTotal.Int64() -
        debtCommitment.Int64() -
        installmentCommitment.Int64(),
    )

    return entity.Summary{
        Month:                      month,
        IncomeTotalCents:           incomeTotal,
        FixedExpenseCents:          fixedTotal,
        VariableExpenseCents:       variableTotal,
        DebtCommitmentCents:        debtCommitment,
        InstallmentCommitmentCents: installmentCommitment,
        BalanceCents:               balance,  // pode ser negativo!
    }, nil
}
```

**Por que o loop em Go e não `SUM()` no SQL?**

Porque o SQL `SUM()` é uma caixa-preta — impossível testar unitariamente, difícil auditar. O loop em Go é código transparente: dá para ler, testar, debugar e auditar linha a linha.

---

## 7. Camada Endpoint

**Pasta:** `endpoint/`

Faz a ponte entre o **service** (que fala em linguagem de domínio) e o **transport** (que fala em HTTP). Usa o padrão do go-kit.

### O que é um Endpoint go-kit?

```go
// Definição do go-kit:
type Endpoint func(ctx context.Context, request interface{}) (response interface{}, error)
```

É uma função que recebe qualquer request e retorna qualquer response. O endpoint não sabe nada de HTTP — só chama o service.

### Exemplo: criar fonte de renda

```go
// endpoint/income_source.go

// O Request struct espelha os campos do JSON que virão do transport
type CreateIncomeSourceRequest struct {
    Name       string                  `json:"name"`
    Kind       entity.IncomeSourceKind `json:"kind"`
    GrossCents entity.Money            `json:"gross_cents"`
    NetCents   entity.Money            `json:"net_cents"`
    Recurrence entity.RecurrenceKind   `json:"recurrence"`
    DayOfMonth int                     `json:"day_of_month"`
}

// O Response carrega o resultado + o erro de domínio
type CreateIncomeSourceResponse struct {
    IncomeSource entity.IncomeSource `json:"income_source"`
    Err          error               `json:"-"` // json:"-" = não aparece no JSON
}

// Failed() é o padrão go-kit: o transport chama isso para saber se houve erro
func (r CreateIncomeSourceResponse) Failed() error { return r.Err }

// O endpoint em si: converte Request → chama service → retorna Response
func makeCreateIncomeSourceEndpoint(svc service.IncomeSourceService) endpoint.Endpoint {
    return func(ctx context.Context, request interface{}) (interface{}, error) {
        req := request.(CreateIncomeSourceRequest)   // type assertion: converte interface{} para o tipo certo
        result, err := svc.Create(ctx, service.CreateIncomeSourceInput{
            Name:       req.Name,
            Kind:       req.Kind,
            // ...
        })
        return CreateIncomeSourceResponse{IncomeSource: result, Err: err}, nil
        //                                                              ↑
        //                          note: retornamos nil no segundo valor
        //           o erro de domínio vai DENTRO do Response, não aqui fora
    }
}
```

**Por que o erro fica dentro do Response e não no segundo retorno da função?**

Porque no go-kit, o erro no segundo retorno é reservado para falhas de infraestrutura (pânico, timeout). Erros de negócio (`ErrNotFound`, `ErrInvalidMoney`) ficam dentro do Response e são tratados pelo `EncodeResponse` no transport.

---

## 8. Camada Transport

**Pasta:** `transport/http/`

Responsável por:
1. Receber a requisição HTTP.
2. Decodificar o JSON do body / parâmetros da URL.
3. Chamar o endpoint.
4. Codificar a resposta em JSON.
5. Traduzir erros de domínio para HTTP status codes.

### 8.1 Como um handler é montado

```go
// transport/http/income_source.go

func RegisterIncomeSourceRoutes(r *mux.Router, ep endpoint.IncomeSourceEndpoints, logger log.Logger) {
    opts := serverOptions(logger)  // configura encoder de erro e logger

    r.Handle("/api/v1/income-sources",
        kithttp.NewServer(
            ep.Create,                         // ← qual endpoint chamar
            decodeCreateIncomeSourceRequest,   // ← como ler a requisição HTTP
            EncodeResponse,                    // ← como escrever a resposta HTTP
            opts...,                           // ← middleware de erro/log
        ),
    ).Methods(http.MethodPost)
}

// Decodifica o body JSON e monta o Request struct
func decodeCreateIncomeSourceRequest(_ context.Context, r *http.Request) (interface{}, error) {
    var req endpoint.CreateIncomeSourceRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        return nil, err
    }
    return req, nil
}
```

### 8.2 Como os erros são traduzidos

```go
// transport/http/errors.go

func EncodeError(_ context.Context, err error, w http.ResponseWriter) {
    // Verifica qual erro de domínio é, usando errors.Is()
    switch {
    case errors.Is(err, entity.ErrNotFound):
        code, status = "NOT_FOUND", http.StatusNotFound      // 404
    case errors.Is(err, entity.ErrInvalidMoney):
        code, status = "VALIDATION_ERROR", http.StatusUnprocessableEntity  // 422
    case errors.Is(err, entity.ErrSystemCategory):
        code, status = "CONFLICT", http.StatusConflict       // 409
    default:
        code, status = "INTERNAL_ERROR", http.StatusInternalServerError    // 500
    }

    json.NewEncoder(w).Encode(errorResponse{
        Error: errorBody{Code: code, Message: err.Error()},
    })
}
```

### 8.3 Middleware de logging

```go
// transport/http/middleware.go

func LoggingMiddleware(logger log.Logger) mux.MiddlewareFunc {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            defer func(begin time.Time) {  // executa quando a função retornar
                logger.Log(
                    "method", r.Method,
                    "path",   r.URL.Path,
                    "status", rw.status,
                    "took",   time.Since(begin),  // tempo de resposta
                )
            }(time.Now())
            next.ServeHTTP(w, r)  // chama o próximo handler
        })
    }
}
```

É por isso que você vê no terminal:
```
method=GET path=/api/v1/categories status=200 took=754.1µs
```

---

## 9. Fluxo completo de uma requisição

Vamos rastrear o que acontece quando você faz:

```
POST /api/v1/income-sources
{ "name": "Salário", "kind": "recurring", "net_cents": 500000, ... }
```

```
HTTP Request entra em 127.0.0.1:8080
    │
    ▼
gorilla/mux — combina "/api/v1/income-sources" + método POST
    │
    ▼
LoggingMiddleware — registra o início da requisição, inicia o timer
    │
    ▼
kithttp.NewServer (transport)
    │
    ├─ decodeCreateIncomeSourceRequest()
    │      json.Decode(body) → CreateIncomeSourceRequest{Name:"Salário", NetCents:500000, ...}
    │
    ▼
makeCreateIncomeSourceEndpoint (endpoint)
    │
    ├─ type assertion: request.(CreateIncomeSourceRequest)
    │
    ▼
incomeSourceService.Create() (service)
    │
    ├─ monta entity.IncomeSource{ID: newUUID(), Name:"Salário", NetCents:500000, ...}
    ├─ entity.Validate() → ok (500000 > 0, day_of_month é válido)
    │
    ▼
incomeSourceRepository.Create() (repository/sqlite)
    │
    ├─ SQL: INSERT INTO income_sources (...) VALUES (?, ?, ...)
    │         com placeholders — sem SQL injection
    │
    ▼
SQLite (finance.db) — persiste no arquivo em disco
    │
    ▼ retorna resultado para cima (caminho inverso)
    │
service retorna entity.IncomeSource preenchida
    │
endpoint retorna CreateIncomeSourceResponse{IncomeSource: ..., Err: nil}
    │
transport: EncodeResponse() detecta Err == nil → serializa em JSON
    │
    ▼
HTTP Response 200 OK
{ "income_source": { "id": "uuid...", "name": "Salário", "net_cents": 500000, ... } }
    │
LoggingMiddleware — registra: method=POST path=/api/v1/income-sources status=200 took=1.2ms
```

---

## 10. Banco de dados SQLite

### Arquivo

O banco é um único arquivo: `./data/finance.db`. Pode ser aberto com qualquer cliente SQLite (ex.: DB Browser for SQLite) para inspecionar os dados diretamente.

### Tabelas

| Tabela | Descrição |
|---|---|
| `categories` | Categorias de gasto (8 do sistema + criadas pelo usuário) |
| `income_sources` | Fontes de renda (salário, freelance, etc.) |
| `expenses` | Gastos fixos e variáveis |
| `debts` | Dívidas (cartão de crédito e empréstimos) |
| `installment_plans` | Compras parceladas |
| `transactions` | Extrato — linha do tempo de todos os lançamentos |

### Convenções do banco

- **IDs**: `TEXT` em formato UUID (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
- **Dinheiro**: `INTEGER` em centavos. R$ 5.000,00 = `500000`.
- **Datas**: `TEXT` em ISO-8601 (`2026-06-23` ou `2026-06-23T18:00:00Z`).
- **Booleanos**: `INTEGER` 0 ou 1 (SQLite não tem tipo boolean nativo).
- **Soft delete**: entidades não são deletadas fisicamente — `active = 0` as desativa.

### Categorias padrão (seed)

Inseridas automaticamente no boot:

| ID | Nome | Cor |
|---|---|---|
| `cat-moradia` | Moradia | `#3B82F6` (azul) |
| `cat-alimentacao` | Alimentação | `#10B981` (verde) |
| `cat-transporte` | Transporte | `#F59E0B` (amarelo) |
| `cat-saude` | Saúde | `#EF4444` (vermelho) |
| `cat-educacao` | Educação | `#8B5CF6` (roxo) |
| `cat-lazer` | Lazer | `#EC4899` (rosa) |
| `cat-assinaturas` | Assinaturas | `#6366F1` (índigo) |
| `cat-outros` | Outros | `#6B7280` (cinza) |

---

## 11. Cada rota explicada

Base URL: `http://localhost:8080/api/v1`

---

### 11.1 Summary (Resumo Mensal)

#### `GET /summary?month=YYYY-MM`

Calcula e retorna o resumo financeiro do mês. Se `month` não for informado, usa o mês atual.

**Como calcula:**
```
saldo = renda_total
      − gastos_fixos
      − débitos_do_mês (transações)
      − compromisso_dívidas (mínimo cartão + parcela empréstimo)
      − parcelas_com_vencimento_no_mês
```

**Resposta:**
```json
{
  "summary": {
    "month": "2026-06",
    "income_total_cents": 500000,
    "fixed_expense_cents": 120000,
    "variable_expense_cents": 23450,
    "expense_total_cents": 143450,
    "debt_commitment_cents": 45000,
    "installment_commitment_cents": 32000,
    "balance_cents": 279550,
    "by_category": [
      {
        "category_id": "cat-alimentacao",
        "category_name": "Alimentação",
        "total_cents": 23450,
        "share_bps": 10000
      }
    ]
  }
}
```

`balance_cents` pode ser **negativo** se o usuário gastou mais do que ganhou.
`share_bps` é o percentual em basis points (10000 bps = 100%).

---

### 11.2 Categories

#### `GET /categories`

Lista todas as categorias (sistema + criadas pelo usuário).

**Resposta:**
```json
{
  "items": [
    {
      "id": "cat-moradia",
      "name": "Moradia",
      "color": "#3B82F6",
      "icon": "home",
      "is_system": true,
      "created_at": "2026-06-23T18:00:00Z"
    }
  ]
}
```

#### `POST /categories`

Cria uma nova categoria personalizada.

**Body:**
```json
{
  "name": "Pets",
  "color": "#F59E0B",
  "icon": "paw"
}
```

#### `PUT /categories/{id}`

Atualiza nome, cor ou ícone. Funciona com campos parciais (só envia o que quer mudar).

**Body (parcial):**
```json
{ "color": "#FF0000" }
```

#### `DELETE /categories/{id}`

- Se `is_system = true` → erro `409 CONFLICT` (não pode deletar categorias do sistema).
- Se há expenses ou transactions vinculadas → erro `409 CONFLICT`.
- Caso contrário → deletado permanentemente.

---

### 11.3 Income Sources (Fontes de Renda)

#### `GET /income-sources?active=true`

Lista fontes de renda. `active=false` inclui as desativadas.

**Resposta:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Salário CLT",
      "kind": "recurring",
      "gross_cents": 600000,
      "net_cents": 500000,
      "recurrence": "monthly",
      "day_of_month": 5,
      "active": true
    }
  ]
}
```

#### `POST /income-sources`

**Campos:**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `name` | string | ✓ | Nome da fonte |
| `kind` | `recurring` ou `one_time` | ✓ | Tipo |
| `net_cents` | int64 | ✓ | Valor líquido em centavos |
| `gross_cents` | int64 | ✗ | Valor bruto (opcional) |
| `recurrence` | `monthly`, `weekly`, `biweekly`, `none` | ✓ | Periodicidade |
| `day_of_month` | int (1–31) | para `recurring` | Dia do mês em que cai |

**Validações:**
- `net_cents` deve ser > 0.
- `gross_cents`, se informado, deve ser ≥ `net_cents`.
- `day_of_month` obrigatório se `kind = recurring`.

#### `PUT /income-sources/{id}`

Atualiza campos. Campos não enviados não são alterados.

#### `DELETE /income-sources/{id}`

**Soft delete**: marca `active = false`. O histórico é preservado.

---

### 11.4 Expenses (Gastos)

#### `GET /expenses?kind=fixed&active=true`

Filtra por `kind` (`fixed` ou `variable`) e por `active`.

#### `POST /expenses`

**Gasto fixo:**
```json
{
  "description": "Aluguel",
  "amount_cents": 120000,
  "kind": "fixed",
  "category_id": "cat-moradia",
  "recurrence": "monthly",
  "day_of_month": 10
}
```

**Gasto variável:**
```json
{
  "description": "Supermercado",
  "amount_cents": 23450,
  "kind": "variable",
  "category_id": "cat-alimentacao",
  "recurrence": "none"
}
```

> **Regra importante:** gasto `variable` gera automaticamente uma `Transaction` de `direction = debit` na data de hoje. Gasto `fixed` não gera — o usuário confirma manualmente quando o débito ocorreu.

#### `PUT /expenses/{id}` / `DELETE /expenses/{id}`

Soft delete para `DELETE`.

---

### 11.5 Debts (Dívidas)

Dois subtipos com campos diferentes.

#### `POST /debts` — Cartão de crédito

```json
{
  "name": "Nubank",
  "kind": "credit_card",
  "limit_cents": 500000,
  "current_balance_cents": 45000,
  "minimum_payment_cents": 9000,
  "due_day": 10,
  "closing_day": 3,
  "interest_rate_bps": 1590
}
```

`interest_rate_bps: 1590` = 15,90% a.m. de juros rotativos.

#### `POST /debts` — Empréstimo/Financiamento

```json
{
  "name": "Financiamento Carro",
  "kind": "loan",
  "principal_cents": 4000000,
  "remaining_balance_cents": 2800000,
  "monthly_payment_cents": 85000,
  "total_installments": 48,
  "paid_installments": 12,
  "interest_rate_bps": 189,
  "due_day": 15
}
```

#### `DELETE /debts/{id}`

Soft delete — bloqueado se houver `installment_plans` ativos vinculados (retorna `409 CONFLICT`).

---

### 11.6 Installment Plans (Parcelamentos)

Representa uma compra parcelada: 1 compra → N parcelas ao longo dos meses.

#### `POST /installment-plans`

```json
{
  "description": "Notebook Samsung 12x",
  "debt_id": "uuid-do-nubank",
  "category_id": "cat-outros",
  "total_cents": 384000,
  "installment_amount_cents": 32000,
  "total_installments": 12,
  "first_due_date": "2026-07-10"
}
```

#### `PUT /installment-plans/{id}/pay`

Marca a próxima parcela como paga. Incrementa `paid_installments`. Quando `paid_installments == total_installments`, desativa o plano automaticamente.

```bash
curl -X PUT http://localhost:8080/api/v1/installment-plans/{id}/pay
```

Sem body — basta o ID na URL.

---

### 11.7 Transactions (Lançamentos/Extrato)

O "extrato" — linha do tempo de todas as movimentações.

#### `GET /transactions?from=2026-06-01&to=2026-06-30&category_id=uuid&direction=debit&page=1&limit=50`

Todos os parâmetros são opcionais.

**Resposta:**
```json
{
  "items": [
    {
      "id": "uuid",
      "date": "2026-06-15",
      "description": "Supermercado",
      "amount_cents": 23450,
      "direction": "debit",
      "category_id": "cat-alimentacao",
      "source_kind": "expense",
      "source_id": "uuid-do-gasto",
      "note": ""
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 142
  }
}
```

`source_kind` indica a origem da transação:
- `expense` → veio de um gasto variável criado automaticamente.
- `income` → veio de uma renda.
- `debt_payment` → pagamento de dívida.
- `installment` → parcela.
- Vazio → lançamento manual.

#### `POST /transactions` — Lançamento manual

```json
{
  "date": "2026-06-15",
  "description": "Presente aniversário",
  "amount_cents": 8000,
  "direction": "debit",
  "category_id": "cat-outros",
  "note": "Presente da Maria"
}
```

#### `DELETE /transactions/{id}`

**Deleção real** (único recurso que não usa soft delete — extrato pode ser corrigido).

---

## 12. Como testar tudo passo a passo

### Passo 0 — Iniciar o servidor

```bash
cd backend
go run ./cmd/server
```

Deixe o servidor rodando. Abra outro terminal para os comandos abaixo.

---

### Passo 1 — Verificar categorias do seed

```bash
curl http://localhost:8080/api/v1/categories
```

Deve retornar 8 categorias com `is_system: true`.

---

### Passo 2 — Cadastrar renda

```bash
curl -X POST http://localhost:8080/api/v1/income-sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Salário CLT",
    "kind": "recurring",
    "gross_cents": 600000,
    "net_cents": 500000,
    "recurrence": "monthly",
    "day_of_month": 5
  }'
```

Guarde o `id` retornado para os próximos passos.

---

### Passo 3 — Ver resumo (com renda)

```bash
curl "http://localhost:8080/api/v1/summary?month=2026-06"
```

Esperado: `income_total_cents: 500000`, `balance_cents: 500000`.

---

### Passo 4 — Cadastrar gasto fixo

```bash
curl -X POST http://localhost:8080/api/v1/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Aluguel",
    "amount_cents": 120000,
    "kind": "fixed",
    "category_id": "cat-moradia",
    "recurrence": "monthly",
    "day_of_month": 10
  }'
```

---

### Passo 5 — Cadastrar gasto variável (gera lançamento automático)

```bash
curl -X POST http://localhost:8080/api/v1/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Supermercado",
    "amount_cents": 23450,
    "kind": "variable",
    "category_id": "cat-alimentacao",
    "recurrence": "none"
  }'
```

---

### Passo 6 — Ver o lançamento gerado automaticamente

```bash
curl "http://localhost:8080/api/v1/transactions"
```

Deve aparecer 1 transaction com `source_kind: "expense"` gerada automaticamente pelo Passo 5. O gasto fixo do Passo 4 **não** aparece aqui ainda (só quando confirmado).

---

### Passo 7 — Ver resumo atualizado

```bash
curl "http://localhost:8080/api/v1/summary?month=2026-06"
```

Esperado agora:
- `fixed_expense_cents: 120000` (aluguel)
- `variable_expense_cents: 23450` (supermercado lançado)
- `balance_cents: 356550` (500000 - 120000 - 23450)

---

### Passo 8 — Cadastrar dívida (cartão)

```bash
curl -X POST http://localhost:8080/api/v1/debts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nubank",
    "kind": "credit_card",
    "limit_cents": 500000,
    "current_balance_cents": 45000,
    "minimum_payment_cents": 9000,
    "due_day": 10,
    "closing_day": 3,
    "interest_rate_bps": 1590
  }'
```

Guarde o `id` retornado.

---

### Passo 9 — Cadastrar parcelamento

```bash
curl -X POST http://localhost:8080/api/v1/installment-plans \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Notebook Samsung 12x",
    "debt_id": "ID_DO_NUBANK_AQUI",
    "category_id": "cat-outros",
    "total_cents": 384000,
    "installment_amount_cents": 32000,
    "total_installments": 12,
    "first_due_date": "2026-06-10"
  }'
```

Guarde o `id` do plano.

---

### Passo 10 — Resumo final (com dívida e parcela)

```bash
curl "http://localhost:8080/api/v1/summary?month=2026-06"
```

Esperado agora:
- `debt_commitment_cents: 9000` (mínimo do Nubank)
- `installment_commitment_cents: 32000` (parcela do notebook)
- `balance_cents` ainda menor.

---

### Passo 11 — Marcar parcela como paga

```bash
curl -X PUT http://localhost:8080/api/v1/installment-plans/ID_DO_PLANO/pay
```

`paid_installments` vai de 0 para 1.

---

### Passo 12 — Testar validações

**net_cents negativo (422):**
```bash
curl -X POST http://localhost:8080/api/v1/income-sources \
  -H "Content-Type: application/json" \
  -d '{"name":"X","kind":"recurring","net_cents":-1,"recurrence":"monthly","day_of_month":5}'
```

**Deletar categoria do sistema (409):**
```bash
curl -X DELETE http://localhost:8080/api/v1/categories/cat-moradia
```

**Buscar ID inexistente (404):**
```bash
curl http://localhost:8080/api/v1/income-sources/id-que-nao-existe
```

---

### Passo 13 — Listar com filtros

```bash
# Só gastos fixos
curl "http://localhost:8080/api/v1/expenses?kind=fixed"

# Só transações de débito de junho
curl "http://localhost:8080/api/v1/transactions?from=2026-06-01&to=2026-06-30&direction=debit"

# Só dívidas de cartão
curl "http://localhost:8080/api/v1/debts?kind=credit_card"
```

---

### Passo 14 — Soft delete vs deleção real

```bash
# Soft delete de uma renda (active vira false, dado preservado)
curl -X DELETE http://localhost:8080/api/v1/income-sources/ID_AQUI

# Verifica que não aparece mais na listagem padrão
curl http://localhost:8080/api/v1/income-sources

# Mas aparece com active=false
curl "http://localhost:8080/api/v1/income-sources?active=false"
```

---

## 13. Regras de negócio implementadas

| Regra | Onde fica | Como funciona |
|---|---|---|
| Gasto variável gera lançamento | `service/expense.go` | Após criar o Expense, cria automaticamente uma Transaction |
| Saldo calculado em Go | `service/summary.go` | Loop em Go, nenhum `SUM()` SQL |
| Dívida com parcelamento não pode ser deletada | `service/debt.go` | Verifica `HasActiveInstallmentPlans()` antes de desativar |
| Parcelamento quitado desativa automaticamente | `service/installment_plan.go` | Quando `paid == total`, seta `active = false` |
| Categorias do sistema são protegidas | `repository/sqlite/category.go` | Verifica `is_system` antes de deletar |
| Categoria com dependências não pode ser deletada | `repository/sqlite/category.go` | Conta expenses/transactions antes de deletar |
| `Validate()` roda antes de persistir | Todos os services | Chamado sempre antes de `repo.Create()` ou `repo.Update()` |

---

## 14. Erros e validações

### Formato padrão de erro

Todos os erros retornam no mesmo formato JSON:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "valor monetário deve ser maior que zero"
  }
}
```

### Tabela de erros

| Código | HTTP | Quando ocorre |
|---|---|---|
| `VALIDATION_ERROR` | 422 | `net_cents <= 0`, `day_of_month` inválido, etc. |
| `NOT_FOUND` | 404 | ID não existe no banco |
| `CONFLICT` | 409 | Deletar categoria do sistema, dívida com parcelamentos, etc. |
| `INTERNAL_ERROR` | 500 | Erro inesperado (bug, banco inacessível) |

### Como o mapeamento funciona

O erro nasce na `entity/` como um valor Go simples (`ErrInvalidMoney`). Sobe pela pilha (service → endpoint → transport) sem ser modificado. No transport, `EncodeError` usa `errors.Is()` para identificar qual erro é e escolher o HTTP status correto.

```
entity.ErrInvalidMoney
    │ nasce aqui, em entity.Validate()
    │
    ▼ sobe via retorno de erro
service.Create() → retorna o erro
    │
    ▼
endpoint → coloca no Response.Err
    │
    ▼
transport.EncodeResponse() → chama EncodeError()
    │
    ▼
errors.Is(err, entity.ErrInvalidMoney) → true → status 422
```

---

*Última atualização: 2026-06-23*
