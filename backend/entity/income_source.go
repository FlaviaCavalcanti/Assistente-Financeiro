package entity

import (
	"errors"
	"time"
)

type IncomeSourceKind string
type RecurrenceKind string

const (
	IncomeKindRecurring IncomeSourceKind = "recurring"
	IncomeKindOneTime   IncomeSourceKind = "one_time"

	RecurrenceMonthly  RecurrenceKind = "monthly"
	RecurrenceWeekly   RecurrenceKind = "weekly"
	RecurrenceBiweekly RecurrenceKind = "biweekly"
	RecurrenceNone     RecurrenceKind = "none"
)

type IncomeSource struct {
	ID         string           `json:"id"`
	Name       string           `json:"name"`
	Kind       IncomeSourceKind `json:"kind"`
	GrossCents Money            `json:"gross_cents"`
	NetCents   Money            `json:"net_cents"`
	Recurrence RecurrenceKind   `json:"recurrence"`
	DayOfMonth int              `json:"day_of_month"`
	Active     bool             `json:"active"`
	CreatedAt  time.Time        `json:"created_at"`
	UpdatedAt  time.Time        `json:"updated_at"`
}

func (i IncomeSource) Validate() error {
	if !i.NetCents.IsValid() {
		return ErrInvalidMoney
	}
	if i.Kind == IncomeKindRecurring && (i.DayOfMonth < 1 || i.DayOfMonth > 31) {
		return ErrInvalidDay
	}
	if i.GrossCents > 0 && i.GrossCents < i.NetCents {
		return errors.New("gross_cents deve ser maior ou igual a net_cents")
	}
	return nil
}
