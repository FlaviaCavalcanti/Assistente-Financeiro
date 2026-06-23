package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/repository"
)

type transactionRepository struct {
	db *DB
}

func NewTransactionRepository(db *DB) *transactionRepository {
	return &transactionRepository{db: db}
}

func (r *transactionRepository) FindAll(ctx context.Context, filter repository.TransactionFilter) ([]entity.Transaction, error) {
	query, args := buildTransactionQuery(filter)
	query += ` ORDER BY date DESC`

	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	page := filter.Page
	if page <= 0 {
		page = 1
	}
	query += fmt.Sprintf(` LIMIT %d OFFSET %d`, limit, (page-1)*limit)

	rows, err := r.db.Conn.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var txs []entity.Transaction
	for rows.Next() {
		t, err := scanTransaction(rows)
		if err != nil {
			return nil, err
		}
		txs = append(txs, t)
	}
	return txs, rows.Err()
}

func (r *transactionRepository) Count(ctx context.Context, filter repository.TransactionFilter) (int, error) {
	base, args := buildTransactionQuery(filter)
	query := fmt.Sprintf(`SELECT COUNT(*) FROM (%s)`, base)
	var count int
	err := r.db.Conn.QueryRowContext(ctx, query, args...).Scan(&count)
	return count, err
}

func (r *transactionRepository) FindByID(ctx context.Context, id string) (entity.Transaction, error) {
	row := r.db.Conn.QueryRowContext(ctx,
		`SELECT id, date, description, amount_cents, direction, category_id, source_kind, source_id, note, created_at, updated_at
		 FROM transactions WHERE id = ?`, id)
	t, err := scanTransaction(row)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.Transaction{}, entity.ErrNotFound
	}
	return t, err
}

func (r *transactionRepository) SumByDirection(ctx context.Context, direction entity.TransactionDirection, from, to time.Time) (entity.Money, error) {
	var total int64
	err := r.db.Conn.QueryRowContext(ctx,
		`SELECT COALESCE(SUM(amount_cents), 0) FROM transactions
		 WHERE direction = ? AND date >= ? AND date <= ?`,
		string(direction), from.Format("2006-01-02"), to.Format("2006-01-02"),
	).Scan(&total)
	return entity.Money(total), err
}

func (r *transactionRepository) SumByCategory(ctx context.Context, from, to time.Time) ([]repository.CategorySum, error) {
	rows, err := r.db.Conn.QueryContext(ctx,
		`SELECT category_id, COALESCE(SUM(amount_cents), 0)
		 FROM transactions
		 WHERE direction = 'debit' AND date >= ? AND date <= ? AND category_id != ''
		 GROUP BY category_id`,
		from.Format("2006-01-02"), to.Format("2006-01-02"),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sums []repository.CategorySum
	for rows.Next() {
		var s repository.CategorySum
		var total int64
		if err := rows.Scan(&s.CategoryID, &total); err != nil {
			return nil, err
		}
		s.TotalCents = entity.Money(total)
		sums = append(sums, s)
	}
	return sums, rows.Err()
}

func (r *transactionRepository) Create(ctx context.Context, t entity.Transaction) error {
	_, err := r.db.Conn.ExecContext(ctx,
		`INSERT INTO transactions (id, date, description, amount_cents, direction, category_id, source_kind, source_id, note, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		t.ID, t.Date.Format("2006-01-02"), t.Description,
		t.AmountCents.Int64(), string(t.Direction),
		t.CategoryID, string(t.SourceKind), t.SourceID, t.Note,
		t.CreatedAt.UTC().Format(time.RFC3339), t.UpdatedAt.UTC().Format(time.RFC3339),
	)
	return err
}

func (r *transactionRepository) Update(ctx context.Context, t entity.Transaction) error {
	res, err := r.db.Conn.ExecContext(ctx,
		`UPDATE transactions
		 SET date=?, description=?, amount_cents=?, direction=?, category_id=?, note=?, updated_at=?
		 WHERE id=?`,
		t.Date.Format("2006-01-02"), t.Description,
		t.AmountCents.Int64(), string(t.Direction),
		t.CategoryID, t.Note,
		t.UpdatedAt.UTC().Format(time.RFC3339), t.ID,
	)
	if err != nil {
		return err
	}
	return checkRowsAffected(res)
}

func (r *transactionRepository) Delete(ctx context.Context, id string) error {
	res, err := r.db.Conn.ExecContext(ctx, `DELETE FROM transactions WHERE id = ?`, id)
	if err != nil {
		return err
	}
	return checkRowsAffected(res)
}

func buildTransactionQuery(f repository.TransactionFilter) (string, []any) {
	query := `SELECT id, date, description, amount_cents, direction, category_id, source_kind, source_id, note, created_at, updated_at
	          FROM transactions WHERE 1=1`
	args := []any{}

	if f.From != nil {
		query += ` AND date >= ?`
		args = append(args, f.From.Format("2006-01-02"))
	}
	if f.To != nil {
		query += ` AND date <= ?`
		args = append(args, f.To.Format("2006-01-02"))
	}
	if f.CategoryID != nil {
		query += ` AND category_id = ?`
		args = append(args, *f.CategoryID)
	}
	if f.Direction != nil {
		query += ` AND direction = ?`
		args = append(args, string(*f.Direction))
	}
	return query, args
}

func scanTransaction(s scanner) (entity.Transaction, error) {
	var t entity.Transaction
	var amountCents int64
	var date, createdAt, updatedAt string

	err := s.Scan(
		&t.ID, &date, &t.Description, &amountCents, &t.Direction,
		&t.CategoryID, &t.SourceKind, &t.SourceID, &t.Note,
		&createdAt, &updatedAt,
	)
	if err != nil {
		return entity.Transaction{}, err
	}

	t.AmountCents = entity.Money(amountCents)
	t.Date, _ = time.Parse("2006-01-02", date)
	t.CreatedAt = parseTime(createdAt)
	t.UpdatedAt = parseTime(updatedAt)
	return t, nil
}
