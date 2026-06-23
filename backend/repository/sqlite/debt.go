package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/repository"
)

type debtRepository struct {
	db *DB
}

func NewDebtRepository(db *DB) *debtRepository {
	return &debtRepository{db: db}
}

func (r *debtRepository) FindAll(ctx context.Context, filter repository.DebtFilter) ([]entity.Debt, error) {
	query := `SELECT id, name, kind,
	           limit_cents, current_balance_cents, minimum_payment_cents, closing_day,
	           principal_cents, remaining_balance_cents, monthly_payment_cents, total_installments, paid_installments,
	           interest_rate_bps, due_day, active, created_at, updated_at
	          FROM debts WHERE 1=1`
	args := []any{}

	if filter.OnlyActive {
		query += ` AND active = 1`
	}
	if filter.Kind != nil {
		query += ` AND kind = ?`
		args = append(args, string(*filter.Kind))
	}
	query += ` ORDER BY name`

	rows, err := r.db.Conn.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var debts []entity.Debt
	for rows.Next() {
		d, err := scanDebt(rows)
		if err != nil {
			return nil, err
		}
		debts = append(debts, d)
	}
	return debts, rows.Err()
}

func (r *debtRepository) FindByID(ctx context.Context, id string) (entity.Debt, error) {
	row := r.db.Conn.QueryRowContext(ctx,
		`SELECT id, name, kind,
		  limit_cents, current_balance_cents, minimum_payment_cents, closing_day,
		  principal_cents, remaining_balance_cents, monthly_payment_cents, total_installments, paid_installments,
		  interest_rate_bps, due_day, active, created_at, updated_at
		 FROM debts WHERE id = ?`, id)
	d, err := scanDebt(row)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.Debt{}, entity.ErrNotFound
	}
	return d, err
}

func (r *debtRepository) Create(ctx context.Context, d entity.Debt) error {
	_, err := r.db.Conn.ExecContext(ctx,
		`INSERT INTO debts (id, name, kind,
		  limit_cents, current_balance_cents, minimum_payment_cents, closing_day,
		  principal_cents, remaining_balance_cents, monthly_payment_cents, total_installments, paid_installments,
		  interest_rate_bps, due_day, active, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		d.ID, d.Name, string(d.Kind),
		d.LimitCents.Int64(), d.CurrentBalanceCents.Int64(), d.MinimumPaymentCents.Int64(), d.ClosingDay,
		d.PrincipalCents.Int64(), d.RemainingBalanceCents.Int64(), d.MonthlyPaymentCents.Int64(),
		d.TotalInstallments, d.PaidInstallments,
		int64(d.InterestRateBps), d.DueDay, boolToInt(d.Active),
		d.CreatedAt.UTC().Format(time.RFC3339), d.UpdatedAt.UTC().Format(time.RFC3339),
	)
	return err
}

func (r *debtRepository) Update(ctx context.Context, d entity.Debt) error {
	res, err := r.db.Conn.ExecContext(ctx,
		`UPDATE debts SET name=?, kind=?,
		  limit_cents=?, current_balance_cents=?, minimum_payment_cents=?, closing_day=?,
		  principal_cents=?, remaining_balance_cents=?, monthly_payment_cents=?,
		  total_installments=?, paid_installments=?,
		  interest_rate_bps=?, due_day=?, updated_at=?
		 WHERE id=?`,
		d.Name, string(d.Kind),
		d.LimitCents.Int64(), d.CurrentBalanceCents.Int64(), d.MinimumPaymentCents.Int64(), d.ClosingDay,
		d.PrincipalCents.Int64(), d.RemainingBalanceCents.Int64(), d.MonthlyPaymentCents.Int64(),
		d.TotalInstallments, d.PaidInstallments,
		int64(d.InterestRateBps), d.DueDay,
		d.UpdatedAt.UTC().Format(time.RFC3339), d.ID,
	)
	if err != nil {
		return err
	}
	return checkRowsAffected(res)
}

func (r *debtRepository) Deactivate(ctx context.Context, id string) error {
	res, err := r.db.Conn.ExecContext(ctx,
		`UPDATE debts SET active=0, updated_at=? WHERE id=?`,
		time.Now().UTC().Format(time.RFC3339), id,
	)
	if err != nil {
		return err
	}
	return checkRowsAffected(res)
}

func (r *debtRepository) HasActiveInstallmentPlans(ctx context.Context, id string) (bool, error) {
	var count int
	err := r.db.Conn.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM installment_plans WHERE debt_id = ? AND active = 1`, id,
	).Scan(&count)
	return count > 0, err
}

func scanDebt(s scanner) (entity.Debt, error) {
	var d entity.Debt
	var limitCents, currentBalance, minPayment int64
	var principalCents, remainingBalance, monthlyPayment int64
	var interestRate int64
	var active int
	var createdAt, updatedAt string

	err := s.Scan(
		&d.ID, &d.Name, &d.Kind,
		&limitCents, &currentBalance, &minPayment, &d.ClosingDay,
		&principalCents, &remainingBalance, &monthlyPayment,
		&d.TotalInstallments, &d.PaidInstallments,
		&interestRate, &d.DueDay, &active, &createdAt, &updatedAt,
	)
	if err != nil {
		return entity.Debt{}, err
	}

	d.LimitCents = entity.Money(limitCents)
	d.CurrentBalanceCents = entity.Money(currentBalance)
	d.MinimumPaymentCents = entity.Money(minPayment)
	d.PrincipalCents = entity.Money(principalCents)
	d.RemainingBalanceCents = entity.Money(remainingBalance)
	d.MonthlyPaymentCents = entity.Money(monthlyPayment)
	d.InterestRateBps = entity.BasisPoints(interestRate)
	d.Active = intToBool(active)
	d.CreatedAt = parseTime(createdAt)
	d.UpdatedAt = parseTime(updatedAt)
	return d, nil
}
