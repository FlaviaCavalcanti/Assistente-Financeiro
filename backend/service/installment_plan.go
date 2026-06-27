package service

import (
	"context"
	"errors"
	"time"

	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/repository"
)

type installmentPlanService struct {
	repo repository.InstallmentPlanRepository
}

func NewInstallmentPlanService(repo repository.InstallmentPlanRepository) InstallmentPlanService {
	return &installmentPlanService{repo: repo}
}

func (s *installmentPlanService) List(ctx context.Context, onlyActive bool) ([]entity.InstallmentPlan, error) {
	return s.repo.FindAll(ctx, onlyActive)
}

func (s *installmentPlanService) Get(ctx context.Context, id string) (entity.InstallmentPlan, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *installmentPlanService) Create(ctx context.Context, input CreateInstallmentInput) (entity.InstallmentPlan, error) {
	firstDueDate, err := time.Parse("2006-01-02", input.FirstDueDate)
	if err != nil {
		return entity.InstallmentPlan{}, errors.New("first_due_date inválida: use formato YYYY-MM-DD")
	}

	totalCents := input.TotalCents
	if totalCents == 0 {
		totalCents = entity.Money(int64(input.InstallmentAmountCents) * int64(input.TotalInstallments))
	}

	now := time.Now().UTC()
	p := entity.InstallmentPlan{
		ID:                     newID(),
		Description:            input.Description,
		DebtID:                 input.DebtID,
		CategoryID:             input.CategoryID,
		TotalCents:             totalCents,
		InstallmentAmountCents: input.InstallmentAmountCents,
		TotalInstallments:      input.TotalInstallments,
		PaidInstallments:       input.PaidInstallments,
		FirstDueDate:           firstDueDate,
		Active:                 true,
		CreatedAt:              now,
		UpdatedAt:              now,
	}
	if err := p.Validate(); err != nil {
		return entity.InstallmentPlan{}, err
	}
	if err := s.repo.Create(ctx, p); err != nil {
		return entity.InstallmentPlan{}, err
	}
	return p, nil
}

func (s *installmentPlanService) MarkInstallmentPaid(ctx context.Context, id string) (entity.InstallmentPlan, error) {
	p, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return entity.InstallmentPlan{}, err
	}
	if p.IsFullyPaid() {
		return entity.InstallmentPlan{}, errors.New("parcelamento já está quitado")
	}
	p.PaidInstallments++
	p.UpdatedAt = time.Now().UTC()

	// Desativa automaticamente quando quitar a última parcela.
	if p.IsFullyPaid() {
		p.Active = false
	}

	if err := s.repo.Update(ctx, p); err != nil {
		return entity.InstallmentPlan{}, err
	}
	return p, nil
}

func (s *installmentPlanService) Deactivate(ctx context.Context, id string) error {
	if _, err := s.repo.FindByID(ctx, id); err != nil {
		return err
	}
	return s.repo.Deactivate(ctx, id)
}
