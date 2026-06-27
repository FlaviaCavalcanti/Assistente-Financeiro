package service

import (
	"context"

	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/repository"
)

// --- Input structs ---

type CreateCategoryInput struct {
	Name  string
	Color string
	Icon  string
}

type UpdateCategoryInput struct {
	Name  *string
	Color *string
	Icon  *string
}

type CreateIncomeSourceInput struct {
	Name       string
	Kind       entity.IncomeSourceKind
	GrossCents entity.Money
	NetCents   entity.Money
	Recurrence entity.RecurrenceKind
	DayOfMonth int
	FirstMonth string // YYYY-MM (renda avulsa)
	LastMonth  string // YYYY-MM (renda avulsa, vazio = só um mês)
}

type UpdateIncomeSourceInput struct {
	Name       *string
	GrossCents *entity.Money
	NetCents   *entity.Money
	Recurrence *entity.RecurrenceKind
	DayOfMonth *int
	FirstMonth *string
	LastMonth  *string
}

type CreateExpenseInput struct {
	Description string
	AmountCents entity.Money
	Kind        entity.ExpenseKind
	CategoryID  string
	Recurrence  entity.RecurrenceKind
	DayOfMonth  int
}

type UpdateExpenseInput struct {
	Description *string
	AmountCents *entity.Money
	CategoryID  *string
	DayOfMonth  *int
}

type CreateDebtInput struct {
	Name string
	Kind entity.DebtKind

	// cartão
	LimitCents          entity.Money
	CurrentBalanceCents entity.Money
	MinimumPaymentCents entity.Money
	ClosingDay          int

	// empréstimo
	PrincipalCents        entity.Money
	RemainingBalanceCents entity.Money
	MonthlyPaymentCents   entity.Money
	TotalInstallments     int
	PaidInstallments      int

	// comuns
	InterestRateBps entity.BasisPoints
	DueDay          int
}

type UpdateDebtInput struct {
	Name                *string
	LimitCents          *entity.Money
	CurrentBalanceCents *entity.Money
	MinimumPaymentCents *entity.Money
	ClosingDay          *int
	RemainingBalanceCents *entity.Money
	MonthlyPaymentCents *entity.Money
	PaidInstallments    *int
	InterestRateBps     *entity.BasisPoints
	DueDay              *int
}

type CreateInstallmentInput struct {
	Description            string
	DebtID                 string
	CategoryID             string
	TotalCents             entity.Money
	InstallmentAmountCents entity.Money
	TotalInstallments      int
	FirstDueDate           string // "YYYY-MM-DD"
}

type CreateTransactionInput struct {
	Date        string // "YYYY-MM-DD"
	Description string
	AmountCents entity.Money
	Direction   entity.TransactionDirection
	CategoryID  string
	Note        string
}

type UpdateTransactionInput struct {
	Date        *string
	Description *string
	AmountCents *entity.Money
	CategoryID  *string
	Note        *string
}

// --- Service interfaces ---

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
	GetMonthly(ctx context.Context, month string) (entity.Summary, error)
}
