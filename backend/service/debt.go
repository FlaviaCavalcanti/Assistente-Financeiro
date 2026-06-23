package service

import (
	"context"
	"time"

	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/repository"
)

type debtService struct {
	repo            repository.DebtRepository
}

func NewDebtService(repo repository.DebtRepository) DebtService {
	return &debtService{repo: repo}
}

func (s *debtService) List(ctx context.Context, filter repository.DebtFilter) ([]entity.Debt, error) {
	return s.repo.FindAll(ctx, filter)
}

func (s *debtService) Get(ctx context.Context, id string) (entity.Debt, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *debtService) Create(ctx context.Context, input CreateDebtInput) (entity.Debt, error) {
	now := time.Now().UTC()
	d := entity.Debt{
		ID:                    newID(),
		Name:                  input.Name,
		Kind:                  input.Kind,
		LimitCents:            input.LimitCents,
		CurrentBalanceCents:   input.CurrentBalanceCents,
		MinimumPaymentCents:   input.MinimumPaymentCents,
		ClosingDay:            input.ClosingDay,
		PrincipalCents:        input.PrincipalCents,
		RemainingBalanceCents: input.RemainingBalanceCents,
		MonthlyPaymentCents:   input.MonthlyPaymentCents,
		TotalInstallments:     input.TotalInstallments,
		PaidInstallments:      input.PaidInstallments,
		InterestRateBps:       input.InterestRateBps,
		DueDay:                input.DueDay,
		Active:                true,
		CreatedAt:             now,
		UpdatedAt:             now,
	}
	if err := d.Validate(); err != nil {
		return entity.Debt{}, err
	}
	if err := s.repo.Create(ctx, d); err != nil {
		return entity.Debt{}, err
	}
	return d, nil
}

func (s *debtService) Update(ctx context.Context, id string, input UpdateDebtInput) (entity.Debt, error) {
	d, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return entity.Debt{}, err
	}
	if input.Name != nil {
		d.Name = *input.Name
	}
	if input.LimitCents != nil {
		d.LimitCents = *input.LimitCents
	}
	if input.CurrentBalanceCents != nil {
		d.CurrentBalanceCents = *input.CurrentBalanceCents
	}
	if input.MinimumPaymentCents != nil {
		d.MinimumPaymentCents = *input.MinimumPaymentCents
	}
	if input.ClosingDay != nil {
		d.ClosingDay = *input.ClosingDay
	}
	if input.RemainingBalanceCents != nil {
		d.RemainingBalanceCents = *input.RemainingBalanceCents
	}
	if input.MonthlyPaymentCents != nil {
		d.MonthlyPaymentCents = *input.MonthlyPaymentCents
	}
	if input.PaidInstallments != nil {
		d.PaidInstallments = *input.PaidInstallments
	}
	if input.InterestRateBps != nil {
		d.InterestRateBps = *input.InterestRateBps
	}
	if input.DueDay != nil {
		d.DueDay = *input.DueDay
	}
	d.UpdatedAt = time.Now().UTC()
	if err := d.Validate(); err != nil {
		return entity.Debt{}, err
	}
	if err := s.repo.Update(ctx, d); err != nil {
		return entity.Debt{}, err
	}
	return d, nil
}

func (s *debtService) Deactivate(ctx context.Context, id string) error {
	hasPlans, err := s.repo.HasActiveInstallmentPlans(ctx, id)
	if err != nil {
		return err
	}
	if hasPlans {
		return entity.ErrHasDependencies
	}
	return s.repo.Deactivate(ctx, id)
}
