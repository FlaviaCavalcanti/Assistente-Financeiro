package service

import (
	"context"
	"time"

	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/repository"
)

type expenseService struct {
	repo        repository.ExpenseRepository
	transaction repository.TransactionRepository
}

func NewExpenseService(repo repository.ExpenseRepository, txRepo repository.TransactionRepository) ExpenseService {
	return &expenseService{repo: repo, transaction: txRepo}
}

func (s *expenseService) List(ctx context.Context, filter repository.ExpenseFilter) ([]entity.Expense, error) {
	return s.repo.FindAll(ctx, filter)
}

func (s *expenseService) Get(ctx context.Context, id string) (entity.Expense, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *expenseService) Create(ctx context.Context, input CreateExpenseInput) (entity.Expense, error) {
	now := time.Now().UTC()
	e := entity.Expense{
		ID:          newID(),
		Description: input.Description,
		AmountCents: input.AmountCents,
		Kind:        input.Kind,
		CategoryID:  input.CategoryID,
		Recurrence:  input.Recurrence,
		DayOfMonth:  input.DayOfMonth,
		Active:      true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := e.Validate(); err != nil {
		return entity.Expense{}, err
	}
	if err := s.repo.Create(ctx, e); err != nil {
		return entity.Expense{}, err
	}

	// Gasto variável gera Transaction automaticamente.
	if input.Kind == entity.ExpenseKindVariable {
		tx := entity.Transaction{
			ID:          newID(),
			Date:        now,
			Description: input.Description,
			AmountCents: input.AmountCents,
			Direction:   entity.DirectionDebit,
			CategoryID:  input.CategoryID,
			SourceKind:  entity.SourceKindExpense,
			SourceID:    e.ID,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		if err := s.transaction.Create(ctx, tx); err != nil {
			return entity.Expense{}, err
		}
	}

	return e, nil
}

func (s *expenseService) Update(ctx context.Context, id string, input UpdateExpenseInput) (entity.Expense, error) {
	e, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return entity.Expense{}, err
	}
	if input.Description != nil {
		e.Description = *input.Description
	}
	if input.AmountCents != nil {
		e.AmountCents = *input.AmountCents
	}
	if input.CategoryID != nil {
		e.CategoryID = *input.CategoryID
	}
	if input.DayOfMonth != nil {
		e.DayOfMonth = *input.DayOfMonth
	}
	e.UpdatedAt = time.Now().UTC()
	if err := e.Validate(); err != nil {
		return entity.Expense{}, err
	}
	if err := s.repo.Update(ctx, e); err != nil {
		return entity.Expense{}, err
	}
	return e, nil
}

func (s *expenseService) Deactivate(ctx context.Context, id string) error {
	if _, err := s.repo.FindByID(ctx, id); err != nil {
		return err
	}
	return s.repo.Deactivate(ctx, id)
}
