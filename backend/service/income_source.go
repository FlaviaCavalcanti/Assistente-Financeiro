package service

import (
	"context"
	"time"

	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/repository"
)

type incomeSourceService struct {
	repo repository.IncomeSourceRepository
}

func NewIncomeSourceService(repo repository.IncomeSourceRepository) IncomeSourceService {
	return &incomeSourceService{repo: repo}
}

func (s *incomeSourceService) List(ctx context.Context, onlyActive bool) ([]entity.IncomeSource, error) {
	return s.repo.FindAll(ctx, onlyActive)
}

func (s *incomeSourceService) Get(ctx context.Context, id string) (entity.IncomeSource, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *incomeSourceService) Create(ctx context.Context, input CreateIncomeSourceInput) (entity.IncomeSource, error) {
	now := time.Now().UTC()
	src := entity.IncomeSource{
		ID:         newID(),
		Name:       input.Name,
		Kind:       input.Kind,
		GrossCents: input.GrossCents,
		NetCents:   input.NetCents,
		Recurrence: input.Recurrence,
		DayOfMonth: input.DayOfMonth,
		FirstMonth: input.FirstMonth,
		LastMonth:  input.LastMonth,
		Active:     true,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	if err := src.Validate(); err != nil {
		return entity.IncomeSource{}, err
	}
	if err := s.repo.Create(ctx, src); err != nil {
		return entity.IncomeSource{}, err
	}
	return src, nil
}

func (s *incomeSourceService) Update(ctx context.Context, id string, input UpdateIncomeSourceInput) (entity.IncomeSource, error) {
	src, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return entity.IncomeSource{}, err
	}
	if input.Name != nil {
		src.Name = *input.Name
	}
	if input.GrossCents != nil {
		src.GrossCents = *input.GrossCents
	}
	if input.NetCents != nil {
		src.NetCents = *input.NetCents
	}
	if input.Recurrence != nil {
		src.Recurrence = *input.Recurrence
	}
	if input.DayOfMonth != nil {
		src.DayOfMonth = *input.DayOfMonth
	}
	if input.FirstMonth != nil {
		src.FirstMonth = *input.FirstMonth
	}
	if input.LastMonth != nil {
		src.LastMonth = *input.LastMonth
	}
	src.UpdatedAt = time.Now().UTC()
	if err := src.Validate(); err != nil {
		return entity.IncomeSource{}, err
	}
	if err := s.repo.Update(ctx, src); err != nil {
		return entity.IncomeSource{}, err
	}
	return src, nil
}

func (s *incomeSourceService) Deactivate(ctx context.Context, id string) error {
	if _, err := s.repo.FindByID(ctx, id); err != nil {
		return err
	}
	return s.repo.Deactivate(ctx, id)
}
