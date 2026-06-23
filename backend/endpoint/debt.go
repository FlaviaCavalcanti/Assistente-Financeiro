package endpoint

import (
	"context"

	"github.com/go-kit/kit/endpoint"
	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/repository"
	"github.com/maya/financeiro/service"
)

type DebtEndpoints struct {
	List       endpoint.Endpoint
	Get        endpoint.Endpoint
	Create     endpoint.Endpoint
	Update     endpoint.Endpoint
	Deactivate endpoint.Endpoint
}

func MakeDebtEndpoints(svc service.DebtService) DebtEndpoints {
	return DebtEndpoints{
		List:       makeListDebtsEndpoint(svc),
		Get:        makeGetDebtEndpoint(svc),
		Create:     makeCreateDebtEndpoint(svc),
		Update:     makeUpdateDebtEndpoint(svc),
		Deactivate: makeDeactivateDebtEndpoint(svc),
	}
}

type ListDebtsRequest struct {
	Kind       *entity.DebtKind
	OnlyActive bool
}

type ListDebtsResponse struct {
	Items []entity.Debt `json:"items"`
	Err   error         `json:"-"`
}

func (r ListDebtsResponse) Failed() error { return r.Err }

type GetDebtRequest struct{ ID string }

type GetDebtResponse struct {
	Debt entity.Debt `json:"debt"`
	Err  error       `json:"-"`
}

func (r GetDebtResponse) Failed() error { return r.Err }

type CreateDebtRequest struct {
	Name                  string              `json:"name"`
	Kind                  entity.DebtKind     `json:"kind"`
	LimitCents            entity.Money        `json:"limit_cents"`
	CurrentBalanceCents   entity.Money        `json:"current_balance_cents"`
	MinimumPaymentCents   entity.Money        `json:"minimum_payment_cents"`
	ClosingDay            int                 `json:"closing_day"`
	PrincipalCents        entity.Money        `json:"principal_cents"`
	RemainingBalanceCents entity.Money        `json:"remaining_balance_cents"`
	MonthlyPaymentCents   entity.Money        `json:"monthly_payment_cents"`
	TotalInstallments     int                 `json:"total_installments"`
	PaidInstallments      int                 `json:"paid_installments"`
	InterestRateBps       entity.BasisPoints  `json:"interest_rate_bps"`
	DueDay                int                 `json:"due_day"`
}

type CreateDebtResponse struct {
	Debt entity.Debt `json:"debt"`
	Err  error       `json:"-"`
}

func (r CreateDebtResponse) Failed() error { return r.Err }

type UpdateDebtRequest struct {
	ID                    string
	Name                  *string             `json:"name"`
	LimitCents            *entity.Money       `json:"limit_cents"`
	CurrentBalanceCents   *entity.Money       `json:"current_balance_cents"`
	MinimumPaymentCents   *entity.Money       `json:"minimum_payment_cents"`
	ClosingDay            *int                `json:"closing_day"`
	RemainingBalanceCents *entity.Money       `json:"remaining_balance_cents"`
	MonthlyPaymentCents   *entity.Money       `json:"monthly_payment_cents"`
	PaidInstallments      *int                `json:"paid_installments"`
	InterestRateBps       *entity.BasisPoints `json:"interest_rate_bps"`
	DueDay                *int                `json:"due_day"`
}

type UpdateDebtResponse struct {
	Debt entity.Debt `json:"debt"`
	Err  error       `json:"-"`
}

func (r UpdateDebtResponse) Failed() error { return r.Err }

type DeactivateDebtRequest struct{ ID string }

type DeactivateDebtResponse struct {
	Err error `json:"-"`
}

func (r DeactivateDebtResponse) Failed() error { return r.Err }

func makeListDebtsEndpoint(svc service.DebtService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(ListDebtsRequest)
		items, err := svc.List(ctx, repository.DebtFilter{Kind: req.Kind, OnlyActive: req.OnlyActive})
		return ListDebtsResponse{Items: items, Err: err}, nil
	}
}

func makeGetDebtEndpoint(svc service.DebtService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(GetDebtRequest)
		d, err := svc.Get(ctx, req.ID)
		return GetDebtResponse{Debt: d, Err: err}, nil
	}
}

func makeCreateDebtEndpoint(svc service.DebtService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(CreateDebtRequest)
		d, err := svc.Create(ctx, service.CreateDebtInput{
			Name: req.Name, Kind: req.Kind,
			LimitCents: req.LimitCents, CurrentBalanceCents: req.CurrentBalanceCents,
			MinimumPaymentCents: req.MinimumPaymentCents, ClosingDay: req.ClosingDay,
			PrincipalCents: req.PrincipalCents, RemainingBalanceCents: req.RemainingBalanceCents,
			MonthlyPaymentCents: req.MonthlyPaymentCents,
			TotalInstallments: req.TotalInstallments, PaidInstallments: req.PaidInstallments,
			InterestRateBps: req.InterestRateBps, DueDay: req.DueDay,
		})
		return CreateDebtResponse{Debt: d, Err: err}, nil
	}
}

func makeUpdateDebtEndpoint(svc service.DebtService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(UpdateDebtRequest)
		d, err := svc.Update(ctx, req.ID, service.UpdateDebtInput{
			Name: req.Name, LimitCents: req.LimitCents,
			CurrentBalanceCents: req.CurrentBalanceCents, MinimumPaymentCents: req.MinimumPaymentCents,
			ClosingDay: req.ClosingDay, RemainingBalanceCents: req.RemainingBalanceCents,
			MonthlyPaymentCents: req.MonthlyPaymentCents, PaidInstallments: req.PaidInstallments,
			InterestRateBps: req.InterestRateBps, DueDay: req.DueDay,
		})
		return UpdateDebtResponse{Debt: d, Err: err}, nil
	}
}

func makeDeactivateDebtEndpoint(svc service.DebtService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(DeactivateDebtRequest)
		err := svc.Deactivate(ctx, req.ID)
		return DeactivateDebtResponse{Err: err}, nil
	}
}
