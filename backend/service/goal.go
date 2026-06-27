package service

import (
	"context"
	"errors"
	"time"

	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/repository"
)

type goalService struct {
	repo repository.GoalRepository
}

func NewGoalService(repo repository.GoalRepository) GoalService {
	return &goalService{repo: repo}
}

func (s *goalService) List(ctx context.Context, onlyActive bool) ([]entity.Goal, error) {
	return s.repo.FindAll(ctx, onlyActive)
}

func (s *goalService) Get(ctx context.Context, id string) (entity.Goal, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *goalService) Create(ctx context.Context, input CreateGoalInput) (entity.Goal, error) {
	icon := input.Icon
	if icon == "" {
		icon = "target"
	}
	color := input.Color
	if color == "" {
		color = "#818CF8"
	}

	now := time.Now().UTC()
	g := entity.Goal{
		ID:           newID(),
		Name:         input.Name,
		Kind:         input.Kind,
		TargetCents:  input.TargetCents,
		TargetMonths: input.TargetMonths,
		CurrentCents: input.CurrentCents,
		Deadline:     input.Deadline,
		Icon:         icon,
		Color:        color,
		Active:       true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if err := g.Validate(); err != nil {
		return entity.Goal{}, err
	}
	if err := s.repo.Create(ctx, g); err != nil {
		return entity.Goal{}, err
	}
	return g, nil
}

func (s *goalService) Update(ctx context.Context, id string, input UpdateGoalInput) (entity.Goal, error) {
	g, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return entity.Goal{}, err
	}
	if input.Name != nil {
		g.Name = *input.Name
	}
	if input.TargetCents != nil {
		g.TargetCents = *input.TargetCents
	}
	if input.TargetMonths != nil {
		g.TargetMonths = *input.TargetMonths
	}
	if input.CurrentCents != nil {
		g.CurrentCents = *input.CurrentCents
	}
	if input.Deadline != nil {
		g.Deadline = *input.Deadline
	}
	if input.Icon != nil {
		g.Icon = *input.Icon
	}
	if input.Color != nil {
		g.Color = *input.Color
	}
	g.UpdatedAt = time.Now().UTC()
	if err := g.Validate(); err != nil {
		return entity.Goal{}, err
	}
	if err := s.repo.Update(ctx, g); err != nil {
		return entity.Goal{}, err
	}
	return g, nil
}

func (s *goalService) Contribute(ctx context.Context, id string, amountCents entity.Money) (entity.Goal, error) {
	g, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return entity.Goal{}, err
	}
	if !amountCents.IsValid() {
		return entity.Goal{}, errors.New("valor do aporte deve ser maior que zero")
	}
	g.CurrentCents = g.CurrentCents.Add(amountCents)
	g.UpdatedAt = time.Now().UTC()
	if err := s.repo.Update(ctx, g); err != nil {
		return entity.Goal{}, err
	}
	return g, nil
}

func (s *goalService) Deactivate(ctx context.Context, id string) error {
	if _, err := s.repo.FindByID(ctx, id); err != nil {
		return err
	}
	return s.repo.Deactivate(ctx, id)
}
