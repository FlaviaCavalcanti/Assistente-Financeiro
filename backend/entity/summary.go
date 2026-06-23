package entity

// Summary é o resultado calculado do resumo mensal. Não é persistido.
type Summary struct {
	Month string `json:"month"`

	IncomeTotalCents Money `json:"income_total_cents"`

	FixedExpenseCents    Money `json:"fixed_expense_cents"`
	VariableExpenseCents Money `json:"variable_expense_cents"`
	ExpenseTotalCents    Money `json:"expense_total_cents"`

	DebtCommitmentCents        Money `json:"debt_commitment_cents"`
	InstallmentCommitmentCents Money `json:"installment_commitment_cents"`

	BalanceCents Money `json:"balance_cents"`

	ByCategory []CategoryBreakdown `json:"by_category"`
}

type CategoryBreakdown struct {
	CategoryID   string      `json:"category_id"`
	CategoryName string      `json:"category_name"`
	TotalCents   Money       `json:"total_cents"`
	ShareBps     BasisPoints `json:"share_bps"`
}
