package entity

import (
	"errors"
	"time"
)

type DebtKind string

const (
	DebtKindCreditCard DebtKind = "credit_card"
	DebtKindLoan       DebtKind = "loan"
)

type Debt struct {
	ID   string   `json:"id"`
	Name string   `json:"name"`
	Kind DebtKind `json:"kind"`

	LimitCents          Money `json:"limit_cents"`
	CurrentBalanceCents Money `json:"current_balance_cents"`
	MinimumPaymentCents Money `json:"minimum_payment_cents"`
	ClosingDay          int   `json:"closing_day"`

	PrincipalCents        Money `json:"principal_cents"`
	RemainingBalanceCents Money `json:"remaining_balance_cents"`
	MonthlyPaymentCents   Money `json:"monthly_payment_cents"`
	TotalInstallments     int   `json:"total_installments"`
	PaidInstallments      int   `json:"paid_installments"`

	InterestRateBps BasisPoints `json:"interest_rate_bps"`
	DueDay          int         `json:"due_day"`
	Active          bool        `json:"active"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
}

func (d Debt) Validate() error {
	if d.DueDay < 1 || d.DueDay > 31 {
		return ErrInvalidDay
	}
	if d.InterestRateBps < 0 {
		return errors.New("interest_rate_bps não pode ser negativo")
	}
	switch d.Kind {
	case DebtKindCreditCard:
		if !d.LimitCents.IsValid() {
			return errors.New("limit_cents obrigatório para cartão de crédito")
		}
	case DebtKindLoan:
		if !d.MonthlyPaymentCents.IsValid() {
			return errors.New("monthly_payment_cents obrigatório para empréstimo")
		}
		if d.PaidInstallments > d.TotalInstallments {
			return errors.New("paid_installments não pode exceder total_installments")
		}
	default:
		return errors.New("kind inválido")
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
