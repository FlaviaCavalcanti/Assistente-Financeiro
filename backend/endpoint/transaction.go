package endpoint

import (
	"context"

	"github.com/go-kit/kit/endpoint"
	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/repository"
	"github.com/maya/financeiro/service"
	"time"
)

type TransactionEndpoints struct {
	List   endpoint.Endpoint
	Get    endpoint.Endpoint
	Create endpoint.Endpoint
	Update endpoint.Endpoint
	Delete endpoint.Endpoint
}

func MakeTransactionEndpoints(svc service.TransactionService) TransactionEndpoints {
	return TransactionEndpoints{
		List:   makeListTransactionsEndpoint(svc),
		Get:    makeGetTransactionEndpoint(svc),
		Create: makeCreateTransactionEndpoint(svc),
		Update: makeUpdateTransactionEndpoint(svc),
		Delete: makeDeleteTransactionEndpoint(svc),
	}
}

type ListTransactionsRequest struct {
	From       *time.Time
	To         *time.Time
	CategoryID *string
	Direction  *entity.TransactionDirection
	Page       int
	Limit      int
}

type ListTransactionsResponse struct {
	Items      []entity.Transaction `json:"items"`
	Pagination Pagination           `json:"pagination"`
	Err        error                `json:"-"`
}

func (r ListTransactionsResponse) Failed() error { return r.Err }

type Pagination struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
	Total int `json:"total"`
}

type GetTransactionRequest struct{ ID string }

type GetTransactionResponse struct {
	Transaction entity.Transaction `json:"transaction"`
	Err         error              `json:"-"`
}

func (r GetTransactionResponse) Failed() error { return r.Err }

type CreateTransactionRequest struct {
	Date        string                      `json:"date"`
	Description string                      `json:"description"`
	AmountCents entity.Money                `json:"amount_cents"`
	Direction   entity.TransactionDirection `json:"direction"`
	CategoryID  string                      `json:"category_id"`
	Note        string                      `json:"note"`
}

type CreateTransactionResponse struct {
	Transaction entity.Transaction `json:"transaction"`
	Err         error              `json:"-"`
}

func (r CreateTransactionResponse) Failed() error { return r.Err }

type UpdateTransactionRequest struct {
	ID          string
	Date        *string       `json:"date"`
	Description *string       `json:"description"`
	AmountCents *entity.Money `json:"amount_cents"`
	CategoryID  *string       `json:"category_id"`
	Note        *string       `json:"note"`
}

type UpdateTransactionResponse struct {
	Transaction entity.Transaction `json:"transaction"`
	Err         error              `json:"-"`
}

func (r UpdateTransactionResponse) Failed() error { return r.Err }

type DeleteTransactionRequest struct{ ID string }

type DeleteTransactionResponse struct {
	Err error `json:"-"`
}

func (r DeleteTransactionResponse) Failed() error { return r.Err }

func makeListTransactionsEndpoint(svc service.TransactionService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(ListTransactionsRequest)
		limit := req.Limit
		if limit <= 0 {
			limit = 50
		}
		page := req.Page
		if page <= 0 {
			page = 1
		}
		items, total, err := svc.List(ctx, repository.TransactionFilter{
			From: req.From, To: req.To,
			CategoryID: req.CategoryID, Direction: req.Direction,
			Page: page, Limit: limit,
		})
		return ListTransactionsResponse{
			Items:      items,
			Pagination: Pagination{Page: page, Limit: limit, Total: total},
			Err:        err,
		}, nil
	}
}

func makeGetTransactionEndpoint(svc service.TransactionService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(GetTransactionRequest)
		t, err := svc.Get(ctx, req.ID)
		return GetTransactionResponse{Transaction: t, Err: err}, nil
	}
}

func makeCreateTransactionEndpoint(svc service.TransactionService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(CreateTransactionRequest)
		t, err := svc.Create(ctx, service.CreateTransactionInput{
			Date: req.Date, Description: req.Description,
			AmountCents: req.AmountCents, Direction: req.Direction,
			CategoryID: req.CategoryID, Note: req.Note,
		})
		return CreateTransactionResponse{Transaction: t, Err: err}, nil
	}
}

func makeUpdateTransactionEndpoint(svc service.TransactionService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(UpdateTransactionRequest)
		t, err := svc.Update(ctx, req.ID, service.UpdateTransactionInput{
			Date: req.Date, Description: req.Description,
			AmountCents: req.AmountCents, CategoryID: req.CategoryID, Note: req.Note,
		})
		return UpdateTransactionResponse{Transaction: t, Err: err}, nil
	}
}

func makeDeleteTransactionEndpoint(svc service.TransactionService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(DeleteTransactionRequest)
		err := svc.Delete(ctx, req.ID)
		return DeleteTransactionResponse{Err: err}, nil
	}
}
