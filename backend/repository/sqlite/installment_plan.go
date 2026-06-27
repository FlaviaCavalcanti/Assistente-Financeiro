package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/maya/financeiro/entity"
)

type installmentPlanRepository struct {
	db *DB
}

func NewInstallmentPlanRepository(db *DB) *installmentPlanRepository {
	return &installmentPlanRepository{db: db}
}

func (r *installmentPlanRepository) FindAll(ctx context.Context, onlyActive bool) ([]entity.InstallmentPlan, error) {
	query := `SELECT id, description, debt_id, category_id,
	           total_cents, installment_amount_cents, total_installments, paid_installments,
	           first_due_date, active, created_at, updated_at
	          FROM installment_plans`
	if onlyActive {
		query += ` WHERE active = 1`
	}
	query += ` ORDER BY first_due_date`

	rows, err := r.db.Conn.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []entity.InstallmentPlan
	for rows.Next() {
		p, err := scanInstallmentPlan(rows)
		if err != nil {
			return nil, err
		}
		plans = append(plans, p)
	}
	return plans, rows.Err()
}

func (r *installmentPlanRepository) FindByID(ctx context.Context, id string) (entity.InstallmentPlan, error) {
	row := r.db.Conn.QueryRowContext(ctx,
		`SELECT id, description, debt_id, category_id,
		  total_cents, installment_amount_cents, total_installments, paid_installments,
		  first_due_date, active, created_at, updated_at
		 FROM installment_plans WHERE id = ?`, id)
	p, err := scanInstallmentPlan(row)
	if errors.Is(err, sql.ErrNoRows) {
		return entity.InstallmentPlan{}, entity.ErrNotFound
	}
	return p, err
}

func (r *installmentPlanRepository) FindByDebtID(ctx context.Context, debtID string, onlyActive bool) ([]entity.InstallmentPlan, error) {
	query := `SELECT id, description, debt_id, category_id,
	           total_cents, installment_amount_cents, total_installments, paid_installments,
	           first_due_date, active, created_at, updated_at
	          FROM installment_plans WHERE debt_id = ?`
	if onlyActive {
		query += ` AND active = 1`
	}

	rows, err := r.db.Conn.QueryContext(ctx, query, debtID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []entity.InstallmentPlan
	for rows.Next() {
		p, err := scanInstallmentPlan(rows)
		if err != nil {
			return nil, err
		}
		plans = append(plans, p)
	}
	return plans, rows.Err()
}

// FindActiveDueInMonth retorna os planos ativos com vencimento no mês/ano informado.
func (r *installmentPlanRepository) FindActiveDueInMonth(ctx context.Context, year int, month int) ([]entity.InstallmentPlan, error) {
	// Um plano tem parcela no mês se: first_due_date <= último dia do mês E ainda tem parcelas restantes.
	// A data da N-ésima parcela = first_due_date + (N-1) meses. Simplificado: buscamos planos ativos
	// onde first_due_date <= fim do mês alvo e paid_installments < total_installments.
	lastDay := fmt.Sprintf("%04d-%02d-28", year, month) // conservador; SQLite não tem função de último dia do mês
	prefix := fmt.Sprintf("%04d-%02d", year, month)

	rows, err := r.db.Conn.QueryContext(ctx,
		`SELECT id, description, debt_id, category_id,
		  total_cents, installment_amount_cents, total_installments, paid_installments,
		  first_due_date, active, created_at, updated_at
		 FROM installment_plans
		 WHERE active = 1
		   AND paid_installments < total_installments
		   AND first_due_date <= ?
		   AND (
		     -- parcelas futuras: calcula se o mês alvo cai dentro do range
		     -- simplificado: filtra por prefix nos casos simples
		     first_due_date LIKE ? OR first_due_date < ?
		   )`,
		lastDay, prefix+"%", prefix+"-01",
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []entity.InstallmentPlan
	for rows.Next() {
		p, err := scanInstallmentPlan(rows)
		if err != nil {
			return nil, err
		}
		plans = append(plans, p)
	}
	return plans, rows.Err()
}

func nullableDebtID(id string) interface{} {
	if id == "" {
		return nil
	}
	return id
}

func (r *installmentPlanRepository) Create(ctx context.Context, p entity.InstallmentPlan) error {
	_, err := r.db.Conn.ExecContext(ctx,
		`INSERT INTO installment_plans
		  (id, description, debt_id, category_id,
		   total_cents, installment_amount_cents, total_installments, paid_installments,
		   first_due_date, active, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.ID, p.Description, nullableDebtID(p.DebtID), p.CategoryID,
		p.TotalCents.Int64(), p.InstallmentAmountCents.Int64(),
		p.TotalInstallments, p.PaidInstallments,
		p.FirstDueDate.Format("2006-01-02"),
		boolToInt(p.Active),
		p.CreatedAt.UTC().Format(time.RFC3339), p.UpdatedAt.UTC().Format(time.RFC3339),
	)
	return err
}

func (r *installmentPlanRepository) Update(ctx context.Context, p entity.InstallmentPlan) error {
	res, err := r.db.Conn.ExecContext(ctx,
		`UPDATE installment_plans
		 SET description=?, debt_id=?, category_id=?,
		     total_cents=?, installment_amount_cents=?, total_installments=?, paid_installments=?,
		     first_due_date=?, updated_at=?
		 WHERE id=?`,
		p.Description, nullableDebtID(p.DebtID), p.CategoryID,
		p.TotalCents.Int64(), p.InstallmentAmountCents.Int64(),
		p.TotalInstallments, p.PaidInstallments,
		p.FirstDueDate.Format("2006-01-02"),
		p.UpdatedAt.UTC().Format(time.RFC3339), p.ID,
	)
	if err != nil {
		return err
	}
	return checkRowsAffected(res)
}

func (r *installmentPlanRepository) Deactivate(ctx context.Context, id string) error {
	res, err := r.db.Conn.ExecContext(ctx,
		`UPDATE installment_plans SET active=0, updated_at=? WHERE id=?`,
		time.Now().UTC().Format(time.RFC3339), id,
	)
	if err != nil {
		return err
	}
	return checkRowsAffected(res)
}

func scanInstallmentPlan(s scanner) (entity.InstallmentPlan, error) {
	var p entity.InstallmentPlan
	var totalCents, installmentCents int64
	var active int
	var debtID sql.NullString
	var firstDueDate, createdAt, updatedAt string

	err := s.Scan(
		&p.ID, &p.Description, &debtID, &p.CategoryID,
		&totalCents, &installmentCents,
		&p.TotalInstallments, &p.PaidInstallments,
		&firstDueDate, &active, &createdAt, &updatedAt,
	)
	if err != nil {
		return entity.InstallmentPlan{}, err
	}

	p.DebtID = debtID.String
	p.TotalCents = entity.Money(totalCents)
	p.InstallmentAmountCents = entity.Money(installmentCents)
	p.Active = intToBool(active)
	p.FirstDueDate, _ = time.Parse("2006-01-02", firstDueDate)
	p.CreatedAt = parseTime(createdAt)
	p.UpdatedAt = parseTime(updatedAt)
	return p, nil
}
