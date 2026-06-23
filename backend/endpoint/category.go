package endpoint

import (
	"context"

	"github.com/go-kit/kit/endpoint"
	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/service"
)

type CategoryEndpoints struct {
	List   endpoint.Endpoint
	Get    endpoint.Endpoint
	Create endpoint.Endpoint
	Update endpoint.Endpoint
	Delete endpoint.Endpoint
}

func MakeCategoryEndpoints(svc service.CategoryService) CategoryEndpoints {
	return CategoryEndpoints{
		List:   makeListCategoriesEndpoint(svc),
		Get:    makeGetCategoryEndpoint(svc),
		Create: makeCreateCategoryEndpoint(svc),
		Update: makeUpdateCategoryEndpoint(svc),
		Delete: makeDeleteCategoryEndpoint(svc),
	}
}

// --- Request / Response ---

type ListCategoriesResponse struct {
	Items []entity.Category `json:"items"`
	Err   error             `json:"-"`
}

func (r ListCategoriesResponse) Failed() error { return r.Err }

type GetCategoryRequest struct{ ID string }

type GetCategoryResponse struct {
	Category entity.Category `json:"category"`
	Err      error           `json:"-"`
}

func (r GetCategoryResponse) Failed() error { return r.Err }

type CreateCategoryRequest struct {
	Name  string `json:"name"`
	Color string `json:"color"`
	Icon  string `json:"icon"`
}

type CreateCategoryResponse struct {
	Category entity.Category `json:"category"`
	Err      error           `json:"-"`
}

func (r CreateCategoryResponse) Failed() error { return r.Err }

type UpdateCategoryRequest struct {
	ID    string
	Name  *string `json:"name"`
	Color *string `json:"color"`
	Icon  *string `json:"icon"`
}

type UpdateCategoryResponse struct {
	Category entity.Category `json:"category"`
	Err      error           `json:"-"`
}

func (r UpdateCategoryResponse) Failed() error { return r.Err }

type DeleteCategoryRequest struct{ ID string }

type DeleteCategoryResponse struct {
	Err error `json:"-"`
}

func (r DeleteCategoryResponse) Failed() error { return r.Err }

// --- Endpoints ---

func makeListCategoriesEndpoint(svc service.CategoryService) endpoint.Endpoint {
	return func(ctx context.Context, _ interface{}) (interface{}, error) {
		items, err := svc.List(ctx)
		return ListCategoriesResponse{Items: items, Err: err}, nil
	}
}

func makeGetCategoryEndpoint(svc service.CategoryService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(GetCategoryRequest)
		c, err := svc.Get(ctx, req.ID)
		return GetCategoryResponse{Category: c, Err: err}, nil
	}
}

func makeCreateCategoryEndpoint(svc service.CategoryService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(CreateCategoryRequest)
		c, err := svc.Create(ctx, service.CreateCategoryInput{
			Name: req.Name, Color: req.Color, Icon: req.Icon,
		})
		return CreateCategoryResponse{Category: c, Err: err}, nil
	}
}

func makeUpdateCategoryEndpoint(svc service.CategoryService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(UpdateCategoryRequest)
		c, err := svc.Update(ctx, req.ID, service.UpdateCategoryInput{
			Name: req.Name, Color: req.Color, Icon: req.Icon,
		})
		return UpdateCategoryResponse{Category: c, Err: err}, nil
	}
}

func makeDeleteCategoryEndpoint(svc service.CategoryService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(DeleteCategoryRequest)
		err := svc.Delete(ctx, req.ID)
		return DeleteCategoryResponse{Err: err}, nil
	}
}
