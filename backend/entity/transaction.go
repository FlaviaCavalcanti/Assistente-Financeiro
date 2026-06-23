package entity

import "time"

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
	ID          string                `json:"id"`
	Date        time.Time             `json:"date"`
	Description string                `json:"description"`
	AmountCents Money                 `json:"amount_cents"`
	Direction   TransactionDirection  `json:"direction"`
	CategoryID  string                `json:"category_id"`
	SourceKind  TransactionSourceKind `json:"source_kind"`
	SourceID    string                `json:"source_id"`
	Note        string                `json:"note"`
	CreatedAt   time.Time             `json:"created_at"`
	UpdatedAt   time.Time             `json:"updated_at"`
}

func (t Transaction) Validate() error {
	if !t.AmountCents.IsValid() {
		return ErrInvalidMoney
	}
	return nil
}
