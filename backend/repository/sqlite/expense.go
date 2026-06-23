package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/repository"
)

type expenseRepository struct {
	db *DB
}

func NewExpenseRepository(db *DB) *expenseRepository {
	return &expenseRepository{db: db}
}

func (r *expenseRepository) FindAll(ctx context.Context, filter repository.ExpenseFilter) ([]entity.Expense, error) {
	query := `SELECT id, description, amount_cents, kind, category_id, recurrence, day_of_month, active, created_at, updated_at
	          FROM expenses WHERE 1=1`
	args := []any{}

	if filter.OnlyActive {
		query += ` AND active = 1`
	}
	if filter.Kind != nil {
		query += ` AND kind = ?`
		args = append(args, string(*filter.Kind))
	}
	query += ` ORDER BY description`

	rows, err := r.db.Conn.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var expenses []entity.Expense
	for rows.Next() {
		e, err := scanExpense(rows)
		if err != nil {
			return nil, err
		}
		expenses = append(expenses, e)
	}
	return expenses, rows.Err()
}

func (r *expenseRepository) FindByID(ctx context.Context, id string) (entity.Expense, error) {
	row := r.db.Conn.QueryRowContext(ctx,
		`SELECT id, description, amount_cents, kind, category_id, recurrence, day_of_month, active, created_at, updated_at
		 FROM expenses WHERE id = ?`, id)
	e, err := scanExpense(row)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.Expense{}, entity.ErrNotFound
	}
	return e, err
}

func (r *expenseRepository) Create(ctx context.Context, e entity.Expense) error {
	_, err := r.db.Conn.ExecContext(ctx,
		`INSERT INTO expenses (id, description, amount_cents, kind, category_id, recurrence, day_of_month, active, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		e.ID, e.Description, e.AmountCents.Int64(), string(e.Kind),
		e.CategoryID, string(e.Recurrence), e.DayOfMonth, boolToInt(e.Active),
		e.CreatedAt.UTC().Format(time.RFC3339), e.UpdatedAt.UTC().Format(time.RFC3339),
	)
	return err
}

func (r *expenseRepository) Update(ctx context.Context, e entity.Expense) error {
	res, err := r.db.Conn.ExecContext(ctx,
		`UPDATE expenses
		 SET description=?, amount_cents=?, kind=?, category_id=?, recurrence=?, day_of_month=?, updated_at=?
		 WHERE id=?`,
		e.Description, e.AmountCents.Int64(), string(e.Kind),
		e.CategoryID, string(e.Recurrence), e.DayOfMonth,
		e.UpdatedAt.UTC().Format(time.RFC3339), e.ID,
	)
	if err != nil {
		return err
	}
	return checkRowsAffected(res)
}

func (r *expenseRepository) Deactivate(ctx context.Context, id string) error {
	res, err := r.db.Conn.ExecContext(ctx,
		`UPDATE expenses SET active=0, updated_at=? WHERE id=?`,
		time.Now().UTC().Format(time.RFC3339), id,
	)
	if err != nil {
		return err
	}
	return checkRowsAffected(res)
}

func scanExpense(s scanner) (entity.Expense, error) {
	var e entity.Expense
	var amountCents int64
	var active int
	var createdAt, updatedAt string

	err := s.Scan(
		&e.ID, &e.Description, &amountCents, &e.Kind,
		&e.CategoryID, &e.Recurrence, &e.DayOfMonth,
		&active, &createdAt, &updatedAt,
	)
	if err != nil {
		return entity.Expense{}, err
	}

	e.AmountCents = entity.Money(amountCents)
	e.Active = intToBool(active)
	e.CreatedAt = parseTime(createdAt)
	e.UpdatedAt = parseTime(updatedAt)
	return e, nil
}
