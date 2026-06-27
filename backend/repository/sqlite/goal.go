package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/maya/financeiro/entity"
)

type goalRepository struct {
	db *DB
}

func NewGoalRepository(db *DB) *goalRepository {
	return &goalRepository{db: db}
}

func (r *goalRepository) FindAll(ctx context.Context, onlyActive bool) ([]entity.Goal, error) {
	query := `SELECT id, name, kind, target_cents, target_months, current_cents,
	           deadline, icon, color, active, created_at, updated_at
	          FROM goals`
	if onlyActive {
		query += ` WHERE active = 1`
	}
	query += ` ORDER BY created_at`

	rows, err := r.db.Conn.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var goals []entity.Goal
	for rows.Next() {
		g, err := scanGoal(rows)
		if err != nil {
			return nil, err
		}
		goals = append(goals, g)
	}
	return goals, rows.Err()
}

func (r *goalRepository) FindByID(ctx context.Context, id string) (entity.Goal, error) {
	row := r.db.Conn.QueryRowContext(ctx,
		`SELECT id, name, kind, target_cents, target_months, current_cents,
		  deadline, icon, color, active, created_at, updated_at
		 FROM goals WHERE id = ?`, id)
	g, err := scanGoal(row)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.Goal{}, entity.ErrNotFound
	}
	return g, err
}

func (r *goalRepository) Create(ctx context.Context, g entity.Goal) error {
	_, err := r.db.Conn.ExecContext(ctx,
		`INSERT INTO goals (id, name, kind, target_cents, target_months, current_cents,
		  deadline, icon, color, active, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		g.ID, g.Name, string(g.Kind),
		g.TargetCents.Int64(), g.TargetMonths, g.CurrentCents.Int64(),
		g.Deadline, g.Icon, g.Color,
		boolToInt(g.Active),
		g.CreatedAt.UTC().Format(time.RFC3339), g.UpdatedAt.UTC().Format(time.RFC3339),
	)
	return err
}

func (r *goalRepository) Update(ctx context.Context, g entity.Goal) error {
	res, err := r.db.Conn.ExecContext(ctx,
		`UPDATE goals SET name=?, kind=?, target_cents=?, target_months=?, current_cents=?,
		  deadline=?, icon=?, color=?, updated_at=?
		 WHERE id=?`,
		g.Name, string(g.Kind),
		g.TargetCents.Int64(), g.TargetMonths, g.CurrentCents.Int64(),
		g.Deadline, g.Icon, g.Color,
		g.UpdatedAt.UTC().Format(time.RFC3339), g.ID,
	)
	if err != nil {
		return err
	}
	return checkRowsAffected(res)
}

func (r *goalRepository) Deactivate(ctx context.Context, id string) error {
	res, err := r.db.Conn.ExecContext(ctx,
		`UPDATE goals SET active=0, updated_at=? WHERE id=?`,
		time.Now().UTC().Format(time.RFC3339), id,
	)
	if err != nil {
		return err
	}
	return checkRowsAffected(res)
}

func scanGoal(s scanner) (entity.Goal, error) {
	var g entity.Goal
	var targetCents, currentCents int64
	var active int
	var kind, createdAt, updatedAt string

	err := s.Scan(
		&g.ID, &g.Name, &kind,
		&targetCents, &g.TargetMonths, &currentCents,
		&g.Deadline, &g.Icon, &g.Color,
		&active, &createdAt, &updatedAt,
	)
	if err != nil {
		return entity.Goal{}, err
	}

	g.Kind = entity.GoalKind(kind)
	g.TargetCents = entity.Money(targetCents)
	g.CurrentCents = entity.Money(currentCents)
	g.Active = intToBool(active)
	g.CreatedAt = parseTime(createdAt)
	g.UpdatedAt = parseTime(updatedAt)
	return g, nil
}
