package entity

import (
	"errors"
	"time"
)

type ExpenseKind string

const (
	ExpenseKindFixed    ExpenseKind = "fixed"
	ExpenseKindVariable ExpenseKind = "variable"
)

type Expense struct {
	ID          string         `json:"id"`
	Description string         `json:"description"`
	AmountCents Money          `json:"amount_cents"`
	Kind        ExpenseKind    `json:"kind"`
	CategoryID  string         `json:"category_id"`
	Recurrence  RecurrenceKind `json:"recurrence"`
	DayOfMonth  int            `json:"day_of_month"`
	Active      bool           `json:"active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
}

func (e Expense) Validate() error {
	if !e.AmountCents.IsValid() {
		return ErrInvalidMoney
	}
	if e.Kind == ExpenseKindFixed {
		if e.Recurrence != RecurrenceMonthly {
			return errors.New("gasto fixo deve ter recorrência mensal")
		}
		if e.DayOfMonth < 1 || e.DayOfMonth > 31 {
			return ErrInvalidDay
		}
	}
	return nil
}
