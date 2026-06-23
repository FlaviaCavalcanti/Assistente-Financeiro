# Spec — Assistente Financeiro Pessoal (Backend)

> Spec-Driven Development: nada é implementado sem estar descrito e aceito aqui.
> Escopo atual: **backend Go apenas**. Frontend fica para fase posterior.

---

## Índice

1. [Visão geral do backend](#1-visão-geral-do-backend)
2. [Arquitetura em camadas](#2-arquitetura-em-camadas)
3. [Camada Entity](#3-camada-entity)
4. [Camada Repository](#4-camada-repository)
5. [Camada Service](#5-camada-service)
6. [Camada Endpoint](#6-camada-endpoint)
7. [Camada Transport](#7-camada-transport)
8. [Schema do banco de dados](#8-schema-do-banco-de-dados)
9. [Contrato da API HTTP](#9-contrato-da-api-http)
10. [Regras de negócio](#10-regras-de-negócio)
11. [Requisitos não-funcionais](#11-requisitos-não-funcionais)
12. [Estrutura de pastas](#12-estrutura-de-pastas)
13. [Critérios de aceite do MVP](#13-critérios-de-aceite-do-mvp)
14. [Decisões em aberto](#14-decisões-em-aberto)

---

## 1. Visão geral do backend

### Stack

| Tecnologia | Papel |
|---|---|
| **Go 1.22+** | Linguagem principal |
| **go-kit** | Framework de serviços: middleware, logging, métricas, transporte |
| **gorilla/mux** | Roteador HTTP |
| **modernc.org/sqlite** | Driver SQLite pure Go (sem cgo) |
| **sqlc** | Geração de queries type-safe a partir do SQL |
| **shopspring/decimal** | Cálculo de juros (onde float64 seria perigoso) |

### Princípios inegociáveis

- **Dinheiro nunca é `float`.** Todo valor monetário é `int64` em centavos no domínio e no banco. `shopspring/decimal` só entra em cálculos de juros compostos.
- **O cálculo nunca sai do Go.** Toda aritmética de fluxo de caixa, projeção e percentual é determinística em Go — LLM só entra na Fase 4 para parsing de texto.
- **Personalização como dado.** Categorias, tipos de renda e regras de insight vivem no banco, não como `const` ou `iota` hardcoded.
- **Single-user no MVP.** Sem auth complexa — API serve apenas em `127.0.0.1`.
- **Interfaces como contrato entre camadas.** Nenhuma camada depende de implementação concreta de outra — apenas das interfaces definidas.

---

## 2. Arquitetura em camadas

### Diagrama de dependências

```
┌─────────────────────────────────────────────────────────────┐
│                        cmd/server                           │
│            (wiring: instancia e conecta tudo)               │
└───────────────────────────┬─────────────────────────────────┘
                            │ usa
         ┌──────────────────▼──────────────────┐
         │             transport/http           │
         │  gorilla/mux · decode · encode       │
         │  middleware de request (log, cors)   │
         └──────────────────┬──────────────────┘
                            │ chama
         ┌──────────────────▼──────────────────┐
         │              endpoint/               │
         │  go-kit Endpoint por operação        │
         │  request/response structs            │
         └──────────────────┬──────────────────┘
                            │ chama interface de
         ┌──────────────────▼──────────────────┐
         │               service/              │
         │  lógica de negócio                  │
         │  go-kit middleware (log, validate)   │
         └──────────────────┬──────────────────┘
                            │ chama interface de
         ┌──────────────────▼──────────────────┐
         │             repository/             │
         │  interface de acesso a dados        │
         │  implementação: sqlite/             │
         └──────────────────┬──────────────────┘
                            │ usa
         ┌──────────────────▼──────────────────┐
         │               entity/               │
         │  structs · value objects · erros    │
         │  invariantes · sem dependências     │
         └─────────────────────────────────────┘
```

### Regra de dependência

> Camadas superiores dependem de camadas inferiores **somente através de interfaces**.
> `entity/` não importa nada do projeto. `repository/` não importa `service/`. E assim por diante.

### Fluxo de uma requisição

```
HTTP Request
    → gorilla/mux roteia para o handler correto
    → transport: decode (JSON → Request struct)
    → endpoint: chama service via go-kit Endpoint
    → service: executa regra de negócio, chama repository
    → repository/sqlite: executa query, retorna entity
    → service: retorna resultado
    → endpoint: retorna Response struct
    → transport: encode (Response struct → JSON)
HTTP Response
```

---

## 3. Camada Entity

**Pacote:** `entity/`

**Responsabilidade:** definir as estruturas de dados do domínio, value objects, erros de domínio e invariantes. Não importa nenhum pacote interno do projeto.

### 3.1 Value Objects

```go
// money.go
// Money representa valor monetário em centavos. Nunca float.
type Money int64

func (m Money) IsValid() bool   { return m > 0 }
func (m Money) IsZero() bool    { return m == 0 }
func (m Money) Add(o Money) Money { return m + o }
func (m Money) Sub(o Money) Money { return m - o }

// BasisPoints representa percentual em pontos base. 1% = 100 bps.
type BasisPoints int64
```

### 3.2 Erros de domínio

```go
// errors.go
var (
    ErrNotFound         = errors.New("not found")
    ErrInvalidMoney     = errors.New("valor monetário deve ser maior que zero")
    ErrInvalidDay       = errors.New("dia deve estar entre 1 e 31")
    ErrConflict         = errors.New("operação viola uma regra de negócio")
    ErrSystemCategory   = errors.New("categorias do sistema não podem ser removidas")
    ErrHasDependencies  = errors.New("entidade possui dependências ativas")
)
```

### 3.3 Entidades

#### `Category`

```go
type Category struct {
    ID        string
    Name      string
    Color     string    // hex CSS, ex: "#4A90D9"
    Icon      string    // nome do ícone, opcional
    IsSystem  bool      // categorias padrão — não podem ser deletadas
    CreatedAt time.Time
}
```

#### `IncomeSource`

```go
type IncomeSourceKind  string
type RecurrenceKind    string

const (
    IncomeKindRecurring IncomeSourceKind = "recurring"
    IncomeKindOneTime   IncomeSourceKind = "one_time"

    RecurrenceMonthly   RecurrenceKind = "monthly"
    RecurrenceWeekly    RecurrenceKind = "weekly"
    RecurrenceBiweekly  RecurrenceKind = "biweekly"
    RecurrenceNone      RecurrenceKind = "none"
)

type IncomeSource struct {
    ID          string
    Name        string
    Kind        IncomeSourceKind
    GrossCents  Money            // opcional; 0 = não informado
    NetCents    Money            // obrigatório: o que cai na conta
    Recurrence  RecurrenceKind
    DayOfMonth  int              // 1–31; obrigatório para recurring
    Active      bool
    CreatedAt   time.Time
    UpdatedAt   time.Time
}

func (i IncomeSource) Validate() error {
    if !i.NetCents.IsValid() {
        return ErrInvalidMoney
    }
    if i.Kind == IncomeKindRecurring && (i.DayOfMonth < 1 || i.DayOfMonth > 31) {
        return ErrInvalidDay
    }
    if i.GrossCents > 0 && i.GrossCents < i.NetCents {
        return errors.New("gross_cents deve ser >= net_cents")
    }
    return nil
}
```

#### `Expense`

```go
type ExpenseKind string

const (
    ExpenseKindFixed    ExpenseKind = "fixed"
    ExpenseKindVariable ExpenseKind = "variable"
)

type Expense struct {
    ID          string
    Description string
    AmountCents Money
    Kind        ExpenseKind
    CategoryID  string
    Recurrence  RecurrenceKind
    DayOfMonth  int        // para fixos: dia de vencimento
    Active      bool
    CreatedAt   time.Time
    UpdatedAt   time.Time
}

func (e Expense) Validate() error {
    if !e.AmountCents.IsValid() {
        return ErrInvalidMoney
    }
    if e.Kind == ExpenseKindFixed && e.Recurrence != RecurrenceMonthly {
        return errors.New("gasto fixo deve ter recorrência mensal")
    }
    if e.Kind == ExpenseKindFixed && (e.DayOfMonth < 1 || e.DayOfMonth > 31) {
        return ErrInvalidDay
    }
    return nil
}
```

#### `Debt`

```go
type DebtKind string

const (
    DebtKindCreditCard DebtKind = "credit_card"
    DebtKindLoan       DebtKind = "loan"
)

type Debt struct {
    ID   string
    Name string
    Kind DebtKind

    // campos de cartão (preenchidos quando Kind = credit_card)
    LimitCents          Money
    CurrentBalanceCents Money
    MinimumPaymentCents Money
    ClosingDay          int

    // campos de empréstimo (preenchidos quando Kind = loan)
    PrincipalCents        Money
    RemainingBalanceCents Money
    MonthlyPaymentCents   Money
    TotalInstallments     int
    PaidInstallments      int

    // campos comuns
    InterestRateBps BasisPoints
    DueDay          int
    Active          bool
    CreatedAt       time.Time
    UpdatedAt       time.Time
}

func (d Debt) Validate() error {
    if d.DueDay < 1 || d.DueDay > 31 {
        return ErrInvalidDay
    }
    if d.Kind == DebtKindCreditCard {
        if !d.LimitCents.IsValid() {
            return errors.New("limit_cents obrigatório para cartão")
        }
    }
    if d.Kind == DebtKindLoan {
        if !d.MonthlyPaymentCents.IsValid() {
            return errors.New("monthly_payment_cents obrigatório para empréstimo")
        }
        if d.PaidInstallments > d.TotalInstallments {
            return errors.New("paid_installments não pode exceder total_installments")
        }
    }
    return nil
}

// MonthlyCommitment retorna o compromisso mensal da dívida.
func (d Debt) MonthlyCommitment() Money {
    switch d.Kind {
    case DebtKindCreditCard:
        return d.MinimumPaymentCents
    case DebtKindLoan:
        return d.MonthlyPaymentCents
    }
    return 0
}
```

#### `InstallmentPlan`

```go
type InstallmentPlan struct {
    ID                     string
    Description            string
    DebtID                 string
    CategoryID             string
    TotalCents             Money
    InstallmentAmountCents Money
    TotalInstallments      int
    PaidInstallments       int
    FirstDueDate           time.Time
    CreatedAt              time.Time
    UpdatedAt              time.Time
}

func (p InstallmentPlan) Validate() error {
    if !p.TotalCents.IsValid() || !p.InstallmentAmountCents.IsValid() {
        return ErrInvalidMoney
    }
    if p.TotalInstallments <= 0 {
        return errors.New("total_installments deve ser maior que zero")
    }
    if p.PaidInstallments > p.TotalInstallments {
        return errors.New("paid_installments não pode exceder total_installments")
    }
    return nil
}

func (p InstallmentPlan) RemainingInstallments() int {
    return p.TotalInstallments - p.PaidInstallments
}
```

#### `Transaction`

```go
type TransactionDirection string
type TransactionSourceKind string

const (
    DirectionCredit TransactionDirection = "credit"
    DirectionDebit  TransactionDirection = "debit"

    SourceKindIncome      TransactionSourceKind = "income"
    SourceKindExpense     TransactionSourceKind = "expense"
    SourceKindDebtPayment TransactionSourceKind = "debt_payment"
    SourceKindInstallment TransactionSourceKind = "installment"
)

type Transaction struct {
    ID          string
    Date        time.Time
    Description string
    AmountCents Money
    Direction   TransactionDirection
    CategoryID  string               // nullable para créditos
    SourceKind  TransactionSourceKind
    SourceID    string               // nullable: lançamento manual não tem source
    Note        string
    CreatedAt   time.Time
    UpdatedAt   time.Time
}

func (t Transaction) Validate() error {
    if !t.AmountCents.IsValid() {
        return ErrInvalidMoney
    }
    return nil
}
```

#### `Summary`

Não é uma entidade persistida — é o resultado calculado do serviço de resumo.

```go
type CategoryBreakdown struct {
    CategoryID   string
    CategoryName string
    TotalCents   Money
    ShareBps     BasisPoints // percentual sobre total de gastos
}

type Summary struct {
    Month    string // "YYYY-MM"

    IncomeTotalCents Money

    FixedExpenseCents    Money
    VariableExpenseCents Money
    ExpenseTotalCents    Money

    DebtCommitmentCents       Money
    InstallmentCommitmentCents Money

    BalanceCents Money // pode ser negativo

    ByCategory []CategoryBreakdown
}
```

---

## 4. Camada Repository

**Pacote:** `repository/`

**Responsabilidade:** definir as **interfaces** de acesso a dados e as implementações concretas em `repository/sqlite/`. A camada de serviço depende apenas das interfaces.

### 4.1 Interfaces

```go
// repository/interfaces.go

type CategoryRepository interface {
    FindAll(ctx context.Context) ([]entity.Category, error)
    FindByID(ctx context.Context, id string) (entity.Category, error)
    Create(ctx context.Context, c entity.Category) error
    Update(ctx context.Context, c entity.Category) error
    Delete(ctx context.Context, id string) error // retorna ErrSystemCategory ou ErrHasDependencies
}

type IncomeSourceRepository interface {
    FindAll(ctx context.Context, onlyActive bool) ([]entity.IncomeSource, error)
    FindByID(ctx context.Context, id string) (entity.IncomeSource, error)
    Create(ctx context.Context, s entity.IncomeSource) error
    Update(ctx context.Context, s entity.IncomeSource) error
    Deactivate(ctx context.Context, id string) error // soft delete
}

type ExpenseRepository interface {
    FindAll(ctx context.Context, filter ExpenseFilter) ([]entity.Expense, error)
    FindByID(ctx context.Context, id string) (entity.Expense, error)
    Create(ctx context.Context, e entity.Expense) error
    Update(ctx context.Context, e entity.Expense) error
    Deactivate(ctx context.Context, id string) error
}

type ExpenseFilter struct {
    Kind       *entity.ExpenseKind
    OnlyActive bool
}

type DebtRepository interface {
    FindAll(ctx context.Context, filter DebtFilter) ([]entity.Debt, error)
    FindByID(ctx context.Context, id string) (entity.Debt, error)
    Create(ctx context.Context, d entity.Debt) error
    Update(ctx context.Context, d entity.Debt) error
    Deactivate(ctx context.Context, id string) error
}

type DebtFilter struct {
    Kind       *entity.DebtKind
    OnlyActive bool
}

type InstallmentPlanRepository interface {
    FindAll(ctx context.Context, onlyActive bool) ([]entity.InstallmentPlan, error)
    FindByID(ctx context.Context, id string) (entity.InstallmentPlan, error)
    FindByDebtID(ctx context.Context, debtID string, onlyActive bool) ([]entity.InstallmentPlan, error)
    Create(ctx context.Context, p entity.InstallmentPlan) error
    Update(ctx context.Context, p entity.InstallmentPlan) error
    Deactivate(ctx context.Context, id string) error
}

type TransactionRepository interface {
    FindAll(ctx context.Context, filter TransactionFilter) ([]entity.Transaction, error)
    Count(ctx context.Context, filter TransactionFilter) (int, error)
    FindByID(ctx context.Context, id string) (entity.Transaction, error)
    Create(ctx context.Context, t entity.Transaction) error
    Update(ctx context.Context, t entity.Transaction) error
    Delete(ctx context.Context, id string) error // deleção real permitida
}

type TransactionFilter struct {
    From       *time.Time
    To         *time.Time
    CategoryID *string
    Direction  *entity.TransactionDirection
    Page       int
    Limit      int
}
```

### 4.2 Implementação SQLite

**Pacote:** `repository/sqlite/`

- Cada interface tem seu arquivo correspondente: `sqlite/category.go`, `sqlite/income_source.go`, etc.
- `sqlite/db.go` gerencia a conexão, `PRAGMA journal_mode=WAL`, e a execução das migrations.
- Queries geradas via **sqlc** a partir de `store/query.sql` — nunca SQL inline hardcoded nos repositórios.
- Parâmetros sempre via placeholder `?` (nunca interpolação de string — prevenção de SQL injection).

```go
// sqlite/db.go (esqueleto)
type DB struct {
    conn *sql.DB
}

func New(path string) (*DB, error) {
    conn, err := sql.Open("sqlite", path)
    // ...
    conn.SetMaxOpenConns(1) // SQLite: uma única conexão de escrita
    if err := runMigrations(conn); err != nil {
        return nil, err
    }
    return &DB{conn: conn}, nil
}
```

---

## 5. Camada Service

**Pacote:** `service/`

**Responsabilidade:** implementar as regras de negócio. Orquestra entidades e repositórios. Não sabe nada de HTTP, SQL ou JSON.

### 5.1 Interfaces de serviço

```go
// service/interfaces.go

type CategoryService interface {
    List(ctx context.Context) ([]entity.Category, error)
    Get(ctx context.Context, id string) (entity.Category, error)
    Create(ctx context.Context, input CreateCategoryInput) (entity.Category, error)
    Update(ctx context.Context, id string, input UpdateCategoryInput) (entity.Category, error)
    Delete(ctx context.Context, id string) error
}

type IncomeSourceService interface {
    List(ctx context.Context, onlyActive bool) ([]entity.IncomeSource, error)
    Get(ctx context.Context, id string) (entity.IncomeSource, error)
    Create(ctx context.Context, input CreateIncomeSourceInput) (entity.IncomeSource, error)
    Update(ctx context.Context, id string, input UpdateIncomeSourceInput) (entity.IncomeSource, error)
    Deactivate(ctx context.Context, id string) error
}

type ExpenseService interface {
    List(ctx context.Context, filter repository.ExpenseFilter) ([]entity.Expense, error)
    Get(ctx context.Context, id string) (entity.Expense, error)
    Create(ctx context.Context, input CreateExpenseInput) (entity.Expense, error)
    Update(ctx context.Context, id string, input UpdateExpenseInput) (entity.Expense, error)
    Deactivate(ctx context.Context, id string) error
}

type DebtService interface {
    List(ctx context.Context, filter repository.DebtFilter) ([]entity.Debt, error)
    Get(ctx context.Context, id string) (entity.Debt, error)
    Create(ctx context.Context, input CreateDebtInput) (entity.Debt, error)
    Update(ctx context.Context, id string, input UpdateDebtInput) (entity.Debt, error)
    Deactivate(ctx context.Context, id string) error
}

type InstallmentPlanService interface {
    List(ctx context.Context, onlyActive bool) ([]entity.InstallmentPlan, error)
    Get(ctx context.Context, id string) (entity.InstallmentPlan, error)
    Create(ctx context.Context, input CreateInstallmentInput) (entity.InstallmentPlan, error)
    MarkInstallmentPaid(ctx context.Context, id string) (entity.InstallmentPlan, error)
    Deactivate(ctx context.Context, id string) error
}

type TransactionService interface {
    List(ctx context.Context, filter repository.TransactionFilter) ([]entity.Transaction, int, error)
    Get(ctx context.Context, id string) (entity.Transaction, error)
    Create(ctx context.Context, input CreateTransactionInput) (entity.Transaction, error)
    Update(ctx context.Context, id string, input UpdateTransactionInput) (entity.Transaction, error)
    Delete(ctx context.Context, id string) error
}

type SummaryService interface {
    GetMonthly(ctx context.Context, month string) (entity.Summary, error) // month = "YYYY-MM"
}
```

### 5.2 Input structs

Os `Input` structs são os DTOs de entrada da camada de serviço — separados das entidades.

```go
// service/income_source.go (exemplo)

type CreateIncomeSourceInput struct {
    Name        string
    Kind        entity.IncomeSourceKind
    GrossCents  entity.Money
    NetCents    entity.Money
    Recurrence  entity.RecurrenceKind
    DayOfMonth  int
}

type UpdateIncomeSourceInput struct {
    Name        *string
    GrossCents  *entity.Money
    NetCents    *entity.Money
    Recurrence  *entity.RecurrenceKind
    DayOfMonth  *int
}
```

### 5.3 Implementação

```go
// service/income_source.go (esqueleto)

type incomeSourceService struct {
    repo repository.IncomeSourceRepository
}

func NewIncomeSourceService(repo repository.IncomeSourceRepository) IncomeSourceService {
    return &incomeSourceService{repo: repo}
}

func (s *incomeSourceService) Create(ctx context.Context, input CreateIncomeSourceInput) (entity.IncomeSource, error) {
    src := entity.IncomeSource{
        ID:         newUUID(),
        Name:       input.Name,
        Kind:       input.Kind,
        GrossCents: input.GrossCents,
        NetCents:   input.NetCents,
        Recurrence: input.Recurrence,
        DayOfMonth: input.DayOfMonth,
        Active:     true,
        CreatedAt:  time.Now().UTC(),
        UpdatedAt:  time.Now().UTC(),
    }
    if err := src.Validate(); err != nil {
        return entity.IncomeSource{}, err
    }
    if err := s.repo.Create(ctx, src); err != nil {
        return entity.IncomeSource{}, err
    }
    return src, nil
}
```

### 5.4 Middleware de serviço (go-kit decorator)

go-kit incentiva o padrão decorator para cross-cutting concerns. Cada serviço terá um `loggingMiddleware` que implementa a mesma interface.

```go
// service/middleware.go (exemplo para IncomeSourceService)

type incomeSourceLoggingMiddleware struct {
    logger log.Logger
    next   IncomeSourceService
}

func NewLoggingMiddleware(logger log.Logger, svc IncomeSourceService) IncomeSourceService {
    return &incomeSourceLoggingMiddleware{logger: logger, next: svc}
}

func (mw *incomeSourceLoggingMiddleware) Create(ctx context.Context, input CreateIncomeSourceInput) (out entity.IncomeSource, err error) {
    defer func(begin time.Time) {
        mw.logger.Log("method", "Create", "name", input.Name, "took", time.Since(begin), "err", err)
    }(time.Now())
    return mw.next.Create(ctx, input)
}
```

### 5.5 SummaryService — regra central

```go
// service/summary.go

// GetMonthly calcula o saldo do mês. Toda aritmética é feita em Go — nunca no banco.
func (s *summaryService) GetMonthly(ctx context.Context, month string) (entity.Summary, error) {
    // 1. Busca fontes de renda ativas → soma net_cents
    // 2. Busca gastos fixos ativos → soma amount_cents
    // 3. Busca transações de débito do mês → soma para variáveis
    // 4. Busca dívidas ativas → soma MonthlyCommitment()
    // 5. Busca planos de parcelamento com vencimento no mês → soma installment_amount_cents
    // 6. balance = renda − fixos − variáveis − dívidas − parcelas
    // 7. Calcula breakdown por categoria com BasisPoints
    // 8. Retorna entity.Summary
}
```

**Invariante:** nenhuma query no `SummaryService` usa `SUM()`, `AVG()` ou qualquer agregação no SQL. O banco só filtra e retorna linhas; Go faz a aritmética.

---

## 6. Camada Endpoint

**Pacote:** `endpoint/`

**Responsabilidade:** adaptar os métodos dos serviços para o padrão `go-kit/kit/endpoint.Endpoint`. Define os structs de request e response de cada operação.

### 6.1 O que é um Endpoint

```go
// go-kit/kit/endpoint
type Endpoint func(ctx context.Context, request interface{}) (response interface{}, err error)
```

Cada método de serviço vira um `Endpoint`. Os erros de domínio são preservados aqui — a camada de transport os traduz para HTTP status codes.

### 6.2 Exemplo — IncomeSource

```go
// endpoint/income_source.go

type CreateIncomeSourceRequest struct {
    Name       string                  `json:"name"`
    Kind       entity.IncomeSourceKind `json:"kind"`
    GrossCents entity.Money            `json:"gross_cents"`
    NetCents   entity.Money            `json:"net_cents"`
    Recurrence entity.RecurrenceKind   `json:"recurrence"`
    DayOfMonth int                     `json:"day_of_month"`
}

type CreateIncomeSourceResponse struct {
    IncomeSource entity.IncomeSource `json:"income_source"`
    Err          error               `json:"-"`
}

func (r CreateIncomeSourceResponse) Failed() error { return r.Err }

func MakeCreateIncomeSourceEndpoint(svc service.IncomeSourceService) endpoint.Endpoint {
    return func(ctx context.Context, request interface{}) (interface{}, error) {
        req := request.(CreateIncomeSourceRequest)
        result, err := svc.Create(ctx, service.CreateIncomeSourceInput{
            Name:       req.Name,
            Kind:       req.Kind,
            GrossCents: req.GrossCents,
            NetCents:   req.NetCents,
            Recurrence: req.Recurrence,
            DayOfMonth: req.DayOfMonth,
        })
        return CreateIncomeSourceResponse{IncomeSource: result, Err: err}, nil
    }
}
```

### 6.3 Conjunto de endpoints por recurso

Cada arquivo em `endpoint/` agrupa os endpoints de um recurso:

```go
type IncomeSourceEndpoints struct {
    List       endpoint.Endpoint
    Get        endpoint.Endpoint
    Create     endpoint.Endpoint
    Update     endpoint.Endpoint
    Deactivate endpoint.Endpoint
}

func MakeIncomeSourceEndpoints(svc service.IncomeSourceService) IncomeSourceEndpoints {
    return IncomeSourceEndpoints{
        List:       MakeListIncomeSourcesEndpoint(svc),
        Get:        MakeGetIncomeSourceEndpoint(svc),
        Create:     MakeCreateIncomeSourceEndpoint(svc),
        Update:     MakeUpdateIncomeSourceEndpoint(svc),
        Deactivate: MakeDeactivateIncomeSourceEndpoint(svc),
    }
}
```

---

## 7. Camada Transport

**Pacote:** `transport/http/`

**Responsabilidade:** receber a requisição HTTP, decodificar o body/params para o Request struct do endpoint, chamar o endpoint e codificar a resposta. Usa **gorilla/mux** para roteamento.

### 7.1 Padrão de handler go-kit

```go
// transport/http/income_source.go (exemplo)

func MakeIncomeSourceHandler(ep endpoint.IncomeSourceEndpoints, logger log.Logger) http.Handler {
    r := mux.NewRouter()

    options := []httptransport.ServerOption{
        httptransport.ServerErrorEncoder(encodeError),
        httptransport.ServerErrorLogger(logger),
    }

    r.Handle("/api/v1/income-sources",
        httptransport.NewServer(ep.List, decodeListIncomeSourcesRequest, encodeResponse, options...),
    ).Methods("GET")

    r.Handle("/api/v1/income-sources",
        httptransport.NewServer(ep.Create, decodeCreateIncomeSourceRequest, encodeResponse, options...),
    ).Methods("POST")

    r.Handle("/api/v1/income-sources/{id}",
        httptransport.NewServer(ep.Get, decodeGetByIDRequest, encodeResponse, options...),
    ).Methods("GET")

    r.Handle("/api/v1/income-sources/{id}",
        httptransport.NewServer(ep.Update, decodeUpdateIncomeSourceRequest, encodeResponse, options...),
    ).Methods("PUT")

    r.Handle("/api/v1/income-sources/{id}",
        httptransport.NewServer(ep.Deactivate, decodeGetByIDRequest, encodeResponse, options...),
    ).Methods("DELETE")

    return r
}

func decodeCreateIncomeSourceRequest(_ context.Context, r *http.Request) (interface{}, error) {
    var req endpoint.CreateIncomeSourceRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        return nil, err
    }
    return req, nil
}
```

### 7.2 Router principal

```go
// transport/http/router.go

func NewRouter(
    categoryEp     endpoint.CategoryEndpoints,
    incomeEp       endpoint.IncomeSourceEndpoints,
    expenseEp      endpoint.ExpenseEndpoints,
    debtEp         endpoint.DebtEndpoints,
    installmentEp  endpoint.InstallmentPlanEndpoints,
    transactionEp  endpoint.TransactionEndpoints,
    summaryEp      endpoint.SummaryEndpoints,
    logger         log.Logger,
) http.Handler {
    r := mux.NewRouter()
    r.Use(loggingMiddleware(logger))
    r.Use(contentTypeMiddleware)

    r.PathPrefix("/api/v1/summary").Handler(MakeSummaryHandler(summaryEp, logger))
    r.PathPrefix("/api/v1/categories").Handler(MakeCategoryHandler(categoryEp, logger))
    r.PathPrefix("/api/v1/income-sources").Handler(MakeIncomeSourceHandler(incomeEp, logger))
    r.PathPrefix("/api/v1/expenses").Handler(MakeExpenseHandler(expenseEp, logger))
    r.PathPrefix("/api/v1/debts").Handler(MakeDebtHandler(debtEp, logger))
    r.PathPrefix("/api/v1/installment-plans").Handler(MakeInstallmentPlanHandler(installmentEp, logger))
    r.PathPrefix("/api/v1/transactions").Handler(MakeTransactionHandler(transactionEp, logger))

    return r
}
```

### 7.3 Encoder de erro padrão

Mapeia erros de domínio para HTTP status codes. Um único lugar no codebase que conhece essa tradução.

```go
// transport/http/errors.go

type errorResponse struct {
    Error errorBody `json:"error"`
}

type errorBody struct {
    Code    string `json:"code"`
    Message string `json:"message"`
}

func encodeError(_ context.Context, err error, w http.ResponseWriter) {
    w.Header().Set("Content-Type", "application/json")

    code := "INTERNAL_ERROR"
    status := http.StatusInternalServerError

    switch {
    case errors.Is(err, entity.ErrNotFound):
        code, status = "NOT_FOUND", http.StatusNotFound
    case errors.Is(err, entity.ErrInvalidMoney),
        errors.Is(err, entity.ErrInvalidDay):
        code, status = "VALIDATION_ERROR", http.StatusUnprocessableEntity
    case errors.Is(err, entity.ErrConflict),
        errors.Is(err, entity.ErrSystemCategory),
        errors.Is(err, entity.ErrHasDependencies):
        code, status = "CONFLICT", http.StatusConflict
    }

    w.WriteHeader(status)
    json.NewEncoder(w).Encode(errorResponse{
        Error: errorBody{Code: code, Message: err.Error()},
    })
}
```

### 7.4 Middleware HTTP

```go
// transport/http/middleware.go

func loggingMiddleware(logger log.Logger) mux.MiddlewareFunc {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            defer func(begin time.Time) {
                logger.Log("method", r.Method, "path", r.URL.Path, "took", time.Since(begin))
            }(time.Now())
            next.ServeHTTP(w, r)
        })
    }
}

func contentTypeMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        next.ServeHTTP(w, r)
    })
}
```

---

## 8. Schema do banco de dados

### Convenções

- UUIDs como `TEXT`.
- Datas como `TEXT` ISO-8601 (`YYYY-MM-DD` ou `YYYY-MM-DDTHH:MM:SSZ`).
- Valores monetários como `INTEGER` (centavos).
- `PRAGMA journal_mode=WAL` — melhor concorrência de leitura.
- `PRAGMA foreign_keys=ON` — integridade referencial ativa.
- Migrations numeradas em `store/migrations/`, aplicadas na inicialização via `PRAGMA user_version`.

### DDL

```sql
-- 001_initial.sql

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE categories (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    color       TEXT NOT NULL DEFAULT '#6B7280',
    icon        TEXT,
    is_system   INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
);

CREATE TABLE income_sources (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    kind          TEXT NOT NULL CHECK(kind IN ('recurring', 'one_time')),
    gross_cents   INTEGER,
    net_cents     INTEGER NOT NULL CHECK(net_cents > 0),
    recurrence    TEXT NOT NULL CHECK(recurrence IN ('monthly', 'weekly', 'biweekly', 'none')),
    day_of_month  INTEGER CHECK(day_of_month BETWEEN 1 AND 31),
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE TABLE expenses (
    id             TEXT PRIMARY KEY,
    description    TEXT NOT NULL,
    amount_cents   INTEGER NOT NULL CHECK(amount_cents > 0),
    kind           TEXT NOT NULL CHECK(kind IN ('fixed', 'variable')),
    category_id    TEXT NOT NULL REFERENCES categories(id),
    recurrence     TEXT NOT NULL CHECK(recurrence IN ('monthly', 'none')),
    day_of_month   INTEGER CHECK(day_of_month BETWEEN 1 AND 31),
    active         INTEGER NOT NULL DEFAULT 1,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
);

CREATE TABLE debts (
    id                       TEXT PRIMARY KEY,
    name                     TEXT NOT NULL,
    kind                     TEXT NOT NULL CHECK(kind IN ('credit_card', 'loan')),
    -- cartão
    limit_cents              INTEGER,
    current_balance_cents    INTEGER,
    minimum_payment_cents    INTEGER,
    closing_day              INTEGER CHECK(closing_day BETWEEN 1 AND 31),
    -- empréstimo
    principal_cents          INTEGER,
    remaining_balance_cents  INTEGER,
    monthly_payment_cents    INTEGER,
    total_installments       INTEGER,
    paid_installments        INTEGER DEFAULT 0,
    -- comuns
    interest_rate_bps        INTEGER NOT NULL DEFAULT 0 CHECK(interest_rate_bps >= 0),
    due_day                  INTEGER NOT NULL CHECK(due_day BETWEEN 1 AND 31),
    active                   INTEGER NOT NULL DEFAULT 1,
    created_at               TEXT NOT NULL,
    updated_at               TEXT NOT NULL
);

CREATE TABLE installment_plans (
    id                        TEXT PRIMARY KEY,
    description               TEXT NOT NULL,
    debt_id                   TEXT NOT NULL REFERENCES debts(id),
    category_id               TEXT NOT NULL REFERENCES categories(id),
    total_cents               INTEGER NOT NULL CHECK(total_cents > 0),
    installment_amount_cents  INTEGER NOT NULL CHECK(installment_amount_cents > 0),
    total_installments        INTEGER NOT NULL CHECK(total_installments > 0),
    paid_installments         INTEGER NOT NULL DEFAULT 0,
    first_due_date            TEXT NOT NULL,
    active                    INTEGER NOT NULL DEFAULT 1,
    created_at                TEXT NOT NULL,
    updated_at                TEXT NOT NULL
);

CREATE TABLE transactions (
    id           TEXT PRIMARY KEY,
    date         TEXT NOT NULL,
    description  TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
    direction    TEXT NOT NULL CHECK(direction IN ('credit', 'debit')),
    category_id  TEXT REFERENCES categories(id),
    source_kind  TEXT CHECK(source_kind IN ('income', 'expense', 'debt_payment', 'installment')),
    source_id    TEXT,
    note         TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

-- Índices
CREATE INDEX idx_transactions_date      ON transactions(date);
CREATE INDEX idx_transactions_category  ON transactions(category_id);
CREATE INDEX idx_transactions_source    ON transactions(source_kind, source_id);
CREATE INDEX idx_expenses_category      ON expenses(category_id);
CREATE INDEX idx_installment_debt       ON installment_plans(debt_id);
CREATE INDEX idx_income_active          ON income_sources(active);
CREATE INDEX idx_expenses_active        ON expenses(active);
CREATE INDEX idx_debts_active           ON debts(active);
```

### Seed de categorias padrão

```sql
-- executado após migration 001
INSERT INTO categories (id, name, color, icon, is_system, created_at) VALUES
  ('cat-moradia',     'Moradia',      '#3B82F6', 'home',          1, datetime('now')),
  ('cat-alimentacao', 'Alimentação',  '#10B981', 'utensils',      1, datetime('now')),
  ('cat-transporte',  'Transporte',   '#F59E0B', 'car',           1, datetime('now')),
  ('cat-saude',       'Saúde',        '#EF4444', 'heart',         1, datetime('now')),
  ('cat-educacao',    'Educação',     '#8B5CF6', 'book',          1, datetime('now')),
  ('cat-lazer',       'Lazer',        '#EC4899', 'smile',         1, datetime('now')),
  ('cat-assinaturas', 'Assinaturas',  '#6366F1', 'repeat',        1, datetime('now')),
  ('cat-outros',      'Outros',       '#6B7280', 'more-horizontal',1, datetime('now'));
```

---

## 9. Contrato da API HTTP

### Convenções

- Base: `http://127.0.0.1:8080/api/v1`
- Content-Type: `application/json`
- Datas: `"YYYY-MM-DD"` (sem horário) ou `"YYYY-MM-DDTHH:MM:SSZ"` (com horário UTC)
- Monetário: `int64` em centavos
- Paginação: `?page=1&limit=50` (limit máx = 200)

### Formato de erro

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "net_cents deve ser maior que zero"
  }
}
```

| Código | HTTP |
|---|---|
| `VALIDATION_ERROR` | 422 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `INTERNAL_ERROR` | 500 |

---

### Endpoints

#### Summary

| Método | Path | Descrição |
|---|---|---|
| GET | `/summary?month=YYYY-MM` | Resumo financeiro do mês |

**GET /summary response:**
```json
{
  "month": "2026-06",
  "income_total_cents": 500000,
  "fixed_expense_cents": 180000,
  "variable_expense_cents": 95000,
  "expense_total_cents": 275000,
  "debt_commitment_cents": 85000,
  "installment_commitment_cents": 32000,
  "balance_cents": 108000,
  "by_category": [
    { "category_id": "uuid", "category_name": "Moradia", "total_cents": 120000, "share_bps": 4364 }
  ]
}
```

---

#### Categories

| Método | Path | Descrição |
|---|---|---|
| GET | `/categories` | Lista todas |
| POST | `/categories` | Cria categoria |
| PUT | `/categories/{id}` | Atualiza |
| DELETE | `/categories/{id}` | Remove (proibido se `is_system` ou com dependências) |

---

#### Income Sources

| Método | Path | Descrição |
|---|---|---|
| GET | `/income-sources?active=true` | Lista fontes de renda |
| GET | `/income-sources/{id}` | Busca por ID |
| POST | `/income-sources` | Cria |
| PUT | `/income-sources/{id}` | Atualiza |
| DELETE | `/income-sources/{id}` | Soft delete (desativa) |

**POST body:**
```json
{
  "name": "Salário CLT",
  "kind": "recurring",
  "gross_cents": 600000,
  "net_cents": 500000,
  "recurrence": "monthly",
  "day_of_month": 5
}
```

---

#### Expenses

| Método | Path | Descrição |
|---|---|---|
| GET | `/expenses?kind=fixed\|variable&active=true` | Lista gastos |
| GET | `/expenses/{id}` | Busca por ID |
| POST | `/expenses` | Cria (variável gera Transaction automaticamente) |
| PUT | `/expenses/{id}` | Atualiza |
| DELETE | `/expenses/{id}` | Soft delete |

---

#### Debts

| Método | Path | Descrição |
|---|---|---|
| GET | `/debts?kind=credit_card\|loan&active=true` | Lista dívidas |
| GET | `/debts/{id}` | Busca por ID |
| POST | `/debts` | Cria |
| PUT | `/debts/{id}` | Atualiza |
| DELETE | `/debts/{id}` | Soft delete (proibido se tem planos ativos) |

---

#### Installment Plans

| Método | Path | Descrição |
|---|---|---|
| GET | `/installment-plans?active=true` | Lista parcelamentos |
| GET | `/installment-plans/{id}` | Busca por ID |
| POST | `/installment-plans` | Cria |
| PUT | `/installment-plans/{id}/pay` | Marca próxima parcela como paga |
| DELETE | `/installment-plans/{id}` | Soft delete |

---

#### Transactions

| Método | Path | Descrição |
|---|---|---|
| GET | `/transactions?from=&to=&category_id=&direction=&page=&limit=` | Lista com filtros e paginação |
| GET | `/transactions/{id}` | Busca por ID |
| POST | `/transactions` | Lançamento manual |
| PUT | `/transactions/{id}` | Atualiza |
| DELETE | `/transactions/{id}` | Deleção real |

**GET /transactions response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "date": "2026-06-15",
      "description": "Supermercado",
      "amount_cents": 23450,
      "direction": "debit",
      "category_id": "uuid",
      "source_kind": "expense",
      "source_id": "uuid",
      "note": null
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 142 }
}
```

---

## 10. Regras de negócio

### Fórmula do saldo mensal

```
balance = income_total
        − fixed_expenses_total      (fixos ativos do mês)
        − variable_expenses_total   (transações de débito do período)
        − debt_commitment_total     (MonthlyCommitment() de cada dívida ativa)
        − installment_commitment    (parcelas com vencimento no mês)
```

### Geração de Transaction automática

- Ao criar um `Expense` com `kind = variable`: o service cria automaticamente uma `Transaction` de `direction = debit` com `source_kind = expense`.
- Gastos fixos **não** geram Transaction automática no MVP — o usuário confirma quando o débito ocorreu.

### Regras de deleção

| Entidade | Comportamento |
|---|---|
| `IncomeSource` | Soft delete sempre permitido |
| `Expense` | Soft delete; Transactions existentes são mantidas |
| `Debt` | Soft delete proibido se houver `InstallmentPlan` ativo → `ErrHasDependencies` |
| `InstallmentPlan` | Soft delete permitido |
| `Category` | Deleção real proibida se `is_system = true` ou se houver `Expense`/`Transaction` vinculada |
| `Transaction` | Deleção real sempre permitida |

### Invariante de dinheiro

`entity.Money` é `int64`. Nunca é convertido para `float64` no domínio. A formatação `"R$ X.XXX,XX"` acontece **somente** na camada de apresentação (futuramente no frontend).

---

## 11. Requisitos não-funcionais

| Requisito | Detalhe |
|---|---|
| **Portabilidade** | Binário único; `modernc.org/sqlite` (pure Go, sem cgo) |
| **Performance** | Resposta < 200 ms para queries locais em SQLite |
| **Segurança** | Bind apenas em `127.0.0.1` — nunca `0.0.0.0` no MVP |
| **Logs** | Estruturado via `go-kit/log`; nível configurável por `LOG_LEVEL` |
| **Configuração** | Via env vars: `PORT` (default 8080), `DB_PATH` (default `./data/finance.db`), `LOG_LEVEL` (default `info`) |
| **SQLite** | `PRAGMA journal_mode=WAL` e `MaxOpenConns(1)` para escrita segura |
| **Testes** | Services testados com repositórios fake (mock das interfaces); transport testado com `httptest` |

---

## 12. Estrutura de pastas

```
backend/
├── cmd/
│   └── server/
│       └── main.go                   # wiring: instancia repos, services, endpoints, router
│
├── entity/                           # CAMADA 1 — sem dependências externas do projeto
│   ├── money.go                      # type Money int64, BasisPoints
│   ├── errors.go                     # ErrNotFound, ErrInvalidMoney, etc.
│   ├── category.go
│   ├── income_source.go
│   ├── expense.go
│   ├── debt.go
│   ├── installment_plan.go
│   ├── transaction.go
│   └── summary.go
│
├── repository/                       # CAMADA 2 — interfaces de acesso a dados
│   ├── interfaces.go                 # todas as interfaces + filter structs
│   └── sqlite/                      # implementações concretas
│       ├── db.go                     # conexão, WAL, migrations
│       ├── category.go
│       ├── income_source.go
│       ├── expense.go
│       ├── debt.go
│       ├── installment_plan.go
│       └── transaction.go
│
├── service/                          # CAMADA 3 — lógica de negócio
│   ├── interfaces.go                 # todas as interfaces de serviço + input structs
│   ├── category.go
│   ├── income_source.go
│   ├── expense.go
│   ├── debt.go
│   ├── installment_plan.go
│   ├── transaction.go
│   ├── summary.go
│   └── middleware.go                 # decorators go-kit (logging por serviço)
│
├── endpoint/                         # CAMADA 4 — go-kit endpoints
│   ├── category.go                   # Request/Response structs + MakeXxxEndpoint
│   ├── income_source.go
│   ├── expense.go
│   ├── debt.go
│   ├── installment_plan.go
│   ├── transaction.go
│   └── summary.go
│
├── transport/
│   └── http/                         # CAMADA 5 — HTTP com gorilla/mux
│       ├── router.go                 # NewRouter: registra todos os sub-routers
│       ├── middleware.go             # logging, content-type
│       ├── errors.go                 # encodeError: domínio → HTTP status
│       ├── encode.go                 # encodeResponse genérico
│       ├── category.go               # decode/encode + MakeCategoryHandler
│       ├── income_source.go
│       ├── expense.go
│       ├── debt.go
│       ├── installment_plan.go
│       ├── transaction.go
│       └── summary.go
│
├── store/
│   └── migrations/
│       ├── 001_initial.sql
│       └── 002_seed_categories.sql
│
├── go.mod
└── go.sum
```

---

## 13. Critérios de aceite do MVP

- [ ] `GET /api/v1/summary?month=YYYY-MM` retorna saldo correto — aritmética em Go, nunca em SQL.
- [ ] CRUD completo de categorias com proteção de categorias do sistema.
- [ ] CRUD de fontes de renda com soft delete.
- [ ] CRUD de gastos; gasto variável gera Transaction automaticamente.
- [ ] CRUD de dívidas (cartão e empréstimo).
- [ ] CRUD de parcelamentos com `PUT /installment-plans/{id}/pay`.
- [ ] Extrato de transactions com filtros e paginação.
- [ ] Erros de domínio mapeados corretamente para HTTP status codes.
- [ ] Nenhum `float64` atravessa as camadas — apenas `entity.Money` (int64).
- [ ] `entity/` não importa nenhum pacote interno.
- [ ] `repository/` não importa `service/` ou `endpoint/` ou `transport/`.
- [ ] Services testados com repositórios fake implementando as interfaces.
- [ ] Servidor binds em `127.0.0.1` apenas.

---

## 14. Decisões em aberto

| # | Questão | Recomendação |
|---|---|---|
| 1 | Movimento simples vs. partidas dobradas | **Simples** — uso pessoal não precisa de balanço contábil |
| 2 | Geração automática de transactions para fixos | Deixar para Fase 2 — MVP só confirma o efetivado |
| 3 | UUID v4 vs. ULID | **UUID v4** — padrão Go sem dependência extra |
| 4 | Biblioteca de UUID | `github.com/google/uuid` |
| 5 | Validação de request no transport ou no service | **No service** via `entity.Validate()` — transport só decodifica |

---

*Última atualização: 2026-06-23*
*Próximo passo: inicializar o módulo Go e implementar `entity/` e a migration `001_initial.sql`.*
