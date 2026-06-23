package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/maya/financeiro/entity"
)

type categoryRepository struct {
	db *DB
}

func NewCategoryRepository(db *DB) *categoryRepository {
	return &categoryRepository{db: db}
}

func (r *categoryRepository) FindAll(ctx context.Context) ([]entity.Category, error) {
	rows, err := r.db.Conn.QueryContext(ctx,
		`SELECT id, name, color, icon, is_system, created_at FROM categories ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []entity.Category
	for rows.Next() {
		var c entity.Category
		var createdAt string
		if err := rows.Scan(&c.ID, &c.Name, &c.Color, &c.Icon, &c.IsSystem, &createdAt); err != nil {
			return nil, err
		}
		c.CreatedAt = parseTime(createdAt)
		categories = append(categories, c)
	}
	return categories, rows.Err()
}

func (r *categoryRepository) FindByID(ctx context.Context, id string) (entity.Category, error) {
	var c entity.Category
	var createdAt string
	err := r.db.Conn.QueryRowContext(ctx,
		`SELECT id, name, color, icon, is_system, created_at FROM categories WHERE id = ?`, id,
	).Scan(&c.ID, &c.Name, &c.Color, &c.Icon, &c.IsSystem, &createdAt)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.Category{}, entity.ErrNotFound
	}
	if err != nil {
		return entity.Category{}, err
	}
	c.CreatedAt = parseTime(createdAt)
	return c, nil
}

func (r *categoryRepository) Create(ctx context.Context, c entity.Category) error {
	_, err := r.db.Conn.ExecContext(ctx,
		`INSERT INTO categories (id, name, color, icon, is_system, created_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		c.ID, c.Name, c.Color, c.Icon, boolToInt(c.IsSystem), c.CreatedAt.UTC().Format(time.RFC3339),
	)
	return err
}

func (r *categoryRepository) Update(ctx context.Context, c entity.Category) error {
	res, err := r.db.Conn.ExecContext(ctx,
		`UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?`,
		c.Name, c.Color, c.Icon, c.ID,
	)
	if err != nil {
		return err
	}
	return checkRowsAffected(res)
}

func (r *categoryRepository) Delete(ctx context.Context, id string) error {
	// verifica se é do sistema
	var isSystem int
	err := r.db.Conn.QueryRowContext(ctx, `SELECT is_system FROM categories WHERE id = ?`, id).Scan(&isSystem)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.ErrNotFound
	}
	if err != nil {
		return err
	}
	if isSystem == 1 {
		return entity.ErrSystemCategory
	}

	// verifica dependências em expenses e transactions
	var count int
	_ = r.db.Conn.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM expenses WHERE category_id = ? AND active = 1`, id,
	).Scan(&count)
	if count > 0 {
		return entity.ErrHasDependencies
	}
	_ = r.db.Conn.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM transactions WHERE category_id = ?`, id,
	).Scan(&count)
	if count > 0 {
		return entity.ErrHasDependencies
	}

	res, err := r.db.Conn.ExecContext(ctx, `DELETE FROM categories WHERE id = ?`, id)
	if err != nil {
		return err
	}
	return checkRowsAffected(res)
}
