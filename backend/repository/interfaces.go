package repository

import (
	"context"
	"time"

	"github.com/maya/financeiro/entity"
)

// --- Filters ---

type ExpenseFilter struct {
	Kind       *entity.ExpenseKind
	OnlyActive bool
}

type DebtFilter struct {
	Kind       *entity.DebtKind
	OnlyActive bool
}

type TransactionFilter struct {
	From       *time.Time
	To         *time.Time
	CategoryID *string
	Direction  *entity.TransactionDirection
	Page       int
	Limit      int
}

// --- Interfaces ---

type CategoryRepository interface {
	FindAll(ctx context.Context) ([]entity.Category, error)
	FindByID(ctx context.Context, id string) (entity.Category, error)
	Create(ctx context.Context, c entity.Category) error
	Update(ctx context.Context, c entity.Category) error
	Delete(ctx context.Context, id string) error
}

type IncomeSourceRepository interface {
	FindAll(ctx context.Context, onlyActive bool) ([]entity.IncomeSource, error)
	FindByID(ctx context.Context, id string) (entity.IncomeSource, error)
	Create(ctx context.Context, s entity.IncomeSource) error
	Update(ctx context.Context, s entity.IncomeSource) error
	Deactivate(ctx context.Context, id string) error
}

type ExpenseRepository interface {
	FindAll(ctx context.Context, filter ExpenseFilter) ([]entity.Expense, error)
	FindByID(ctx context.Context, id string) (entity.Expense, error)
	Create(ctx context.Context, e entity.Expense) error
	Update(ctx context.Context, e entity.Expense) error
	Deactivate(ctx context.Context, id string) error
}

type DebtRepository interface {
	FindAll(ctx context.Context, filter DebtFilter) ([]entity.Debt, error)
	FindByID(ctx context.Context, id string) (entity.Debt, error)
	Create(ctx context.Context, d entity.Debt) error
	Update(ctx context.Context, d entity.Debt) error
	Deactivate(ctx context.Context, id string) error
	HasActiveInstallmentPlans(ctx context.Context, id string) (bool, error)
}

type InstallmentPlanRepository interface {
	FindAll(ctx context.Context, onlyActive bool) ([]entity.InstallmentPlan, error)
	FindByID(ctx context.Context, id string) (entity.InstallmentPlan, error)
	FindByDebtID(ctx context.Context, debtID string, onlyActive bool) ([]entity.InstallmentPlan, error)
	FindActiveDueInMonth(ctx context.Context, year int, month int) ([]entity.InstallmentPlan, error)
	Create(ctx context.Context, p entity.InstallmentPlan) error
	Update(ctx context.Context, p entity.InstallmentPlan) error
	Deactivate(ctx context.Context, id string) error
}

type TransactionRepository interface {
	FindAll(ctx context.Context, filter TransactionFilter) ([]entity.Transaction, error)
	Count(ctx context.Context, filter TransactionFilter) (int, error)
	FindByID(ctx context.Context, id string) (entity.Transaction, error)
	SumByDirection(ctx context.Context, direction entity.TransactionDirection, from, to time.Time) (entity.Money, error)
	SumByCategory(ctx context.Context, from, to time.Time) ([]CategorySum, error)
	Create(ctx context.Context, t entity.Transaction) error
	Update(ctx context.Context, t entity.Transaction) error
	Delete(ctx context.Context, id string) error
}

type CategorySum struct {
	CategoryID string
	TotalCents entity.Money
}
