package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/maya/financeiro/entity"
)

type incomeSourceRepository struct {
	db *DB
}

func NewIncomeSourceRepository(db *DB) *incomeSourceRepository {
	return &incomeSourceRepository{db: db}
}

func (r *incomeSourceRepository) FindAll(ctx context.Context, onlyActive bool) ([]entity.IncomeSource, error) {
	query := `SELECT id, name, kind, gross_cents, net_cents, recurrence, day_of_month, first_month, last_month, active, created_at, updated_at
	          FROM income_sources`
	if onlyActive {
		query += ` WHERE active = 1`
	}
	query += ` ORDER BY name`

	rows, err := r.db.Conn.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sources []entity.IncomeSource
	for rows.Next() {
		s, err := scanIncomeSource(rows)
		if err != nil {
			return nil, err
		}
		sources = append(sources, s)
	}
	return sources, rows.Err()
}

func (r *incomeSourceRepository) FindByID(ctx context.Context, id string) (entity.IncomeSource, error) {
	row := r.db.Conn.QueryRowContext(ctx,
		`SELECT id, name, kind, gross_cents, net_cents, recurrence, day_of_month, first_month, last_month, active, created_at, updated_at
		 FROM income_sources WHERE id = ?`, id)
	s, err := scanIncomeSource(row)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.IncomeSource{}, entity.ErrNotFound
	}
	return s, err
}

func (r *incomeSourceRepository) Create(ctx context.Context, s entity.IncomeSource) error {
	_, err := r.db.Conn.ExecContext(ctx,
		`INSERT INTO income_sources (id, name, kind, gross_cents, net_cents, recurrence, day_of_month, first_month, last_month, active, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		s.ID, s.Name, string(s.Kind), s.GrossCents.Int64(), s.NetCents.Int64(),
		string(s.Recurrence), s.DayOfMonth, s.FirstMonth, s.LastMonth, boolToInt(s.Active),
		s.CreatedAt.UTC().Format(time.RFC3339), s.UpdatedAt.UTC().Format(time.RFC3339),
	)
	return err
}

func (r *incomeSourceRepository) Update(ctx context.Context, s entity.IncomeSource) error {
	res, err := r.db.Conn.ExecContext(ctx,
		`UPDATE income_sources
		 SET name=?, kind=?, gross_cents=?, net_cents=?, recurrence=?, day_of_month=?, first_month=?, last_month=?, updated_at=?
		 WHERE id=?`,
		s.Name, string(s.Kind), s.GrossCents.Int64(), s.NetCents.Int64(),
		string(s.Recurrence), s.DayOfMonth, s.FirstMonth, s.LastMonth,
		s.UpdatedAt.UTC().Format(time.RFC3339), s.ID,
	)
	if err != nil {
		return err
	}
	return checkRowsAffected(res)
}

func (r *incomeSourceRepository) Deactivate(ctx context.Context, id string) error {
	res, err := r.db.Conn.ExecContext(ctx,
		`UPDATE income_sources SET active=0, updated_at=? WHERE id=?`,
		time.Now().UTC().Format(time.RFC3339), id,
	)
	if err != nil {
		return err
	}
	return checkRowsAffected(res)
}

// scanner aceita tanto *sql.Row quanto *sql.Rows
type scanner interface {
	Scan(dest ...any) error
}

func scanIncomeSource(s scanner) (entity.IncomeSource, error) {
	var src entity.IncomeSource
	var grossCents, netCents int64
	var active int
	var createdAt, updatedAt string

	err := s.Scan(
		&src.ID, &src.Name, &src.Kind,
		&grossCents, &netCents,
		&src.Recurrence, &src.DayOfMonth,
		&src.FirstMonth, &src.LastMonth,
		&active, &createdAt, &updatedAt,
	)
	if err != nil {
		return entity.IncomeSource{}, err
	}

	src.GrossCents = entity.Money(grossCents)
	src.NetCents = entity.Money(netCents)
	src.Active = intToBool(active)
	src.CreatedAt = parseTime(createdAt)
	src.UpdatedAt = parseTime(updatedAt)
	return src, nil
}
