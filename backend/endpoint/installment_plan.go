package endpoint

import (
	"context"

	"github.com/go-kit/kit/endpoint"
	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/service"
)

type InstallmentPlanEndpoints struct {
	List        endpoint.Endpoint
	Get         endpoint.Endpoint
	Create      endpoint.Endpoint
	MarkPaid    endpoint.Endpoint
	Deactivate  endpoint.Endpoint
}

func MakeInstallmentPlanEndpoints(svc service.InstallmentPlanService) InstallmentPlanEndpoints {
	return InstallmentPlanEndpoints{
		List:       makeListInstallmentPlansEndpoint(svc),
		Get:        makeGetInstallmentPlanEndpoint(svc),
		Create:     makeCreateInstallmentPlanEndpoint(svc),
		MarkPaid:   makeMarkInstallmentPaidEndpoint(svc),
		Deactivate: makeDeactivateInstallmentPlanEndpoint(svc),
	}
}

type ListInstallmentPlansRequest struct{ OnlyActive bool }

type ListInstallmentPlansResponse struct {
	Items []entity.InstallmentPlan `json:"items"`
	Err   error                    `json:"-"`
}

func (r ListInstallmentPlansResponse) Failed() error { return r.Err }

type GetInstallmentPlanRequest struct{ ID string }

type GetInstallmentPlanResponse struct {
	Plan entity.InstallmentPlan `json:"plan"`
	Err  error                  `json:"-"`
}

func (r GetInstallmentPlanResponse) Failed() error { return r.Err }

type CreateInstallmentPlanRequest struct {
	Description            string       `json:"description"`
	DebtID                 string       `json:"debt_id"` // vazio = sem cartão
	CategoryID             string       `json:"category_id"`
	TotalCents             entity.Money `json:"total_cents"`
	InstallmentAmountCents entity.Money `json:"installment_amount_cents"`
	TotalInstallments      int          `json:"total_installments"`
	PaidInstallments       int          `json:"paid_installments"`
	FirstDueDate           string       `json:"first_due_date"` // próximo vencimento
}

type CreateInstallmentPlanResponse struct {
	Plan entity.InstallmentPlan `json:"plan"`
	Err  error                  `json:"-"`
}

func (r CreateInstallmentPlanResponse) Failed() error { return r.Err }

type MarkInstallmentPaidRequest struct{ ID string }

type MarkInstallmentPaidResponse struct {
	Plan entity.InstallmentPlan `json:"plan"`
	Err  error                  `json:"-"`
}

func (r MarkInstallmentPaidResponse) Failed() error { return r.Err }

type DeactivateInstallmentPlanRequest struct{ ID string }

type DeactivateInstallmentPlanResponse struct {
	Err error `json:"-"`
}

func (r DeactivateInstallmentPlanResponse) Failed() error { return r.Err }

func makeListInstallmentPlansEndpoint(svc service.InstallmentPlanService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(ListInstallmentPlansRequest)
		items, err := svc.List(ctx, req.OnlyActive)
		return ListInstallmentPlansResponse{Items: items, Err: err}, nil
	}
}

func makeGetInstallmentPlanEndpoint(svc service.InstallmentPlanService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(GetInstallmentPlanRequest)
		p, err := svc.Get(ctx, req.ID)
		return GetInstallmentPlanResponse{Plan: p, Err: err}, nil
	}
}

func makeCreateInstallmentPlanEndpoint(svc service.InstallmentPlanService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(CreateInstallmentPlanRequest)
		p, err := svc.Create(ctx, service.CreateInstallmentInput{
			Description: req.Description, DebtID: req.DebtID, CategoryID: req.CategoryID,
			TotalCents: req.TotalCents, InstallmentAmountCents: req.InstallmentAmountCents,
			TotalInstallments: req.TotalInstallments, PaidInstallments: req.PaidInstallments,
			FirstDueDate: req.FirstDueDate,
		})
		return CreateInstallmentPlanResponse{Plan: p, Err: err}, nil
	}
}

func makeMarkInstallmentPaidEndpoint(svc service.InstallmentPlanService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(MarkInstallmentPaidRequest)
		p, err := svc.MarkInstallmentPaid(ctx, req.ID)
		return MarkInstallmentPaidResponse{Plan: p, Err: err}, nil
	}
}

func makeDeactivateInstallmentPlanEndpoint(svc service.InstallmentPlanService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(DeactivateInstallmentPlanRequest)
		err := svc.Deactivate(ctx, req.ID)
		return DeactivateInstallmentPlanResponse{Err: err}, nil
	}
}
