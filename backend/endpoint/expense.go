package endpoint

import (
	"context"

	"github.com/go-kit/kit/endpoint"
	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/repository"
	"github.com/maya/financeiro/service"
)

type ExpenseEndpoints struct {
	List       endpoint.Endpoint
	Get        endpoint.Endpoint
	Create     endpoint.Endpoint
	Update     endpoint.Endpoint
	Deactivate endpoint.Endpoint
}

func MakeExpenseEndpoints(svc service.ExpenseService) ExpenseEndpoints {
	return ExpenseEndpoints{
		List:       makeListExpensesEndpoint(svc),
		Get:        makeGetExpenseEndpoint(svc),
		Create:     makeCreateExpenseEndpoint(svc),
		Update:     makeUpdateExpenseEndpoint(svc),
		Deactivate: makeDeactivateExpenseEndpoint(svc),
	}
}

type ListExpensesRequest struct {
	Kind       *entity.ExpenseKind
	OnlyActive bool
}

type ListExpensesResponse struct {
	Items []entity.Expense `json:"items"`
	Err   error            `json:"-"`
}

func (r ListExpensesResponse) Failed() error { return r.Err }

type GetExpenseRequest struct{ ID string }

type GetExpenseResponse struct {
	Expense entity.Expense `json:"expense"`
	Err     error          `json:"-"`
}

func (r GetExpenseResponse) Failed() error { return r.Err }

type CreateExpenseRequest struct {
	Description string              `json:"description"`
	AmountCents entity.Money        `json:"amount_cents"`
	Kind        entity.ExpenseKind  `json:"kind"`
	CategoryID  string              `json:"category_id"`
	Recurrence  entity.RecurrenceKind `json:"recurrence"`
	DayOfMonth  int                 `json:"day_of_month"`
}

type CreateExpenseResponse struct {
	Expense entity.Expense `json:"expense"`
	Err     error          `json:"-"`
}

func (r CreateExpenseResponse) Failed() error { return r.Err }

type UpdateExpenseRequest struct {
	ID          string
	Description *string      `json:"description"`
	AmountCents *entity.Money `json:"amount_cents"`
	CategoryID  *string      `json:"category_id"`
	DayOfMonth  *int         `json:"day_of_month"`
}

type UpdateExpenseResponse struct {
	Expense entity.Expense `json:"expense"`
	Err     error          `json:"-"`
}

func (r UpdateExpenseResponse) Failed() error { return r.Err }

type DeactivateExpenseRequest struct{ ID string }

type DeactivateExpenseResponse struct {
	Err error `json:"-"`
}

func (r DeactivateExpenseResponse) Failed() error { return r.Err }

func makeListExpensesEndpoint(svc service.ExpenseService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(ListExpensesRequest)
		items, err := svc.List(ctx, repository.ExpenseFilter{Kind: req.Kind, OnlyActive: req.OnlyActive})
		return ListExpensesResponse{Items: items, Err: err}, nil
	}
}

func makeGetExpenseEndpoint(svc service.ExpenseService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(GetExpenseRequest)
		e, err := svc.Get(ctx, req.ID)
		return GetExpenseResponse{Expense: e, Err: err}, nil
	}
}

func makeCreateExpenseEndpoint(svc service.ExpenseService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(CreateExpenseRequest)
		e, err := svc.Create(ctx, service.CreateExpenseInput{
			Description: req.Description, AmountCents: req.AmountCents, Kind: req.Kind,
			CategoryID: req.CategoryID, Recurrence: req.Recurrence, DayOfMonth: req.DayOfMonth,
		})
		return CreateExpenseResponse{Expense: e, Err: err}, nil
	}
}

func makeUpdateExpenseEndpoint(svc service.ExpenseService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(UpdateExpenseRequest)
		e, err := svc.Update(ctx, req.ID, service.UpdateExpenseInput{
			Description: req.Description, AmountCents: req.AmountCents,
			CategoryID: req.CategoryID, DayOfMonth: req.DayOfMonth,
		})
		return UpdateExpenseResponse{Expense: e, Err: err}, nil
	}
}

func makeDeactivateExpenseEndpoint(svc service.ExpenseService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(DeactivateExpenseRequest)
		err := svc.Deactivate(ctx, req.ID)
		return DeactivateExpenseResponse{Err: err}, nil
	}
}
