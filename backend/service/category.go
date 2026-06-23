package service

import (
	"context"
	"time"

	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/repository"
)

type categoryService struct {
	repo repository.CategoryRepository
}

func NewCategoryService(repo repository.CategoryRepository) CategoryService {
	return &categoryService{repo: repo}
}

func (s *categoryService) List(ctx context.Context) ([]entity.Category, error) {
	return s.repo.FindAll(ctx)
}

func (s *categoryService) Get(ctx context.Context, id string) (entity.Category, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *categoryService) Create(ctx context.Context, input CreateCategoryInput) (entity.Category, error) {
	c := entity.Category{
		ID:        newID(),
		Name:      input.Name,
		Color:     input.Color,
		Icon:      input.Icon,
		IsSystem:  false,
		CreatedAt: time.Now().UTC(),
	}
	if err := s.repo.Create(ctx, c); err != nil {
		return entity.Category{}, err
	}
	return c, nil
}

func (s *categoryService) Update(ctx context.Context, id string, input UpdateCategoryInput) (entity.Category, error) {
	c, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return entity.Category{}, err
	}
	if input.Name != nil {
		c.Name = *input.Name
	}
	if input.Color != nil {
		c.Color = *input.Color
	}
	if input.Icon != nil {
		c.Icon = *input.Icon
	}
	if err := s.repo.Update(ctx, c); err != nil {
		return entity.Category{}, err
	}
	return c, nil
}

func (s *categoryService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
