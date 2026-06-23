package service

import (
	"context"
	"errors"
	"time"

	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/repository"
)

type transactionService struct {
	repo repository.TransactionRepository
}

func NewTransactionService(repo repository.TransactionRepository) TransactionService {
	return &transactionService{repo: repo}
}

func (s *transactionService) List(ctx context.Context, filter repository.TransactionFilter) ([]entity.Transaction, int, error) {
	txs, err := s.repo.FindAll(ctx, filter)
	if err != nil {
		return nil, 0, err
	}
	total, err := s.repo.Count(ctx, filter)
	if err != nil {
		return nil, 0, err
	}
	return txs, total, nil
}

func (s *transactionService) Get(ctx context.Context, id string) (entity.Transaction, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *transactionService) Create(ctx context.Context, input CreateTransactionInput) (entity.Transaction, error) {
	date, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		return entity.Transaction{}, errors.New("date inválida: use formato YYYY-MM-DD")
	}

	now := time.Now().UTC()
	tx := entity.Transaction{
		ID:          newID(),
		Date:        date,
		Description: input.Description,
		AmountCents: input.AmountCents,
		Direction:   input.Direction,
		CategoryID:  input.CategoryID,
		Note:        input.Note,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := tx.Validate(); err != nil {
		return entity.Transaction{}, err
	}
	if err := s.repo.Create(ctx, tx); err != nil {
		return entity.Transaction{}, err
	}
	return tx, nil
}

func (s *transactionService) Update(ctx context.Context, id string, input UpdateTransactionInput) (entity.Transaction, error) {
	tx, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return entity.Transaction{}, err
	}
	if input.Date != nil {
		d, err := time.Parse("2006-01-02", *input.Date)
		if err != nil {
			return entity.Transaction{}, errors.New("date inválida: use formato YYYY-MM-DD")
		}
		tx.Date = d
	}
	if input.Description != nil {
		tx.Description = *input.Description
	}
	if input.AmountCents != nil {
		tx.AmountCents = *input.AmountCents
	}
	if input.CategoryID != nil {
		tx.CategoryID = *input.CategoryID
	}
	if input.Note != nil {
		tx.Note = *input.Note
	}
	tx.UpdatedAt = time.Now().UTC()
	if err := tx.Validate(); err != nil {
		return entity.Transaction{}, err
	}
	if err := s.repo.Update(ctx, tx); err != nil {
		return entity.Transaction{}, err
	}
	return tx, nil
}

func (s *transactionService) Delete(ctx context.Context, id string) error {
	if _, err := s.repo.FindByID(ctx, id); err != nil {
		return err
	}
	return s.repo.Delete(ctx, id)
}
