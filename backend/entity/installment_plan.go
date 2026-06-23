package entity

import (
	"errors"
	"time"
)

type InstallmentPlan struct {
	ID                     string    `json:"id"`
	Description            string    `json:"description"`
	DebtID                 string    `json:"debt_id"`
	CategoryID             string    `json:"category_id"`
	TotalCents             Money     `json:"total_cents"`
	InstallmentAmountCents Money     `json:"installment_amount_cents"`
	TotalInstallments      int       `json:"total_installments"`
	PaidInstallments       int       `json:"paid_installments"`
	FirstDueDate           time.Time `json:"first_due_date"`
	Active                 bool      `json:"active"`
	CreatedAt              time.Time `json:"created_at"`
	UpdatedAt              time.Time `json:"updated_at"`
}

func (p InstallmentPlan) Validate() error {
	if !p.TotalCents.IsValid() {
		return ErrInvalidMoney
	}
	if !p.InstallmentAmountCents.IsValid() {
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

func (p InstallmentPlan) IsFullyPaid() bool {
	return p.PaidInstallments >= p.TotalInstallments
}
