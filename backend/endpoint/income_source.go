package endpoint

import (
	"context"

	"github.com/go-kit/kit/endpoint"
	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/service"
)

type IncomeSourceEndpoints struct {
	List       endpoint.Endpoint
	Get        endpoint.Endpoint
	Create     endpoint.Endpoint
	Update     endpoint.Endpoint
	Deactivate endpoint.Endpoint
}

func MakeIncomeSourceEndpoints(svc service.IncomeSourceService) IncomeSourceEndpoints {
	return IncomeSourceEndpoints{
		List:       makeListIncomeSourcesEndpoint(svc),
		Get:        makeGetIncomeSourceEndpoint(svc),
		Create:     makeCreateIncomeSourceEndpoint(svc),
		Update:     makeUpdateIncomeSourceEndpoint(svc),
		Deactivate: makeDeactivateIncomeSourceEndpoint(svc),
	}
}

type ListIncomeSourcesRequest struct{ OnlyActive bool }

type ListIncomeSourcesResponse struct {
	Items []entity.IncomeSource `json:"items"`
	Err   error                 `json:"-"`
}

func (r ListIncomeSourcesResponse) Failed() error { return r.Err }

type GetIncomeSourceRequest struct{ ID string }

type GetIncomeSourceResponse struct {
	IncomeSource entity.IncomeSource `json:"income_source"`
	Err          error               `json:"-"`
}

func (r GetIncomeSourceResponse) Failed() error { return r.Err }

type CreateIncomeSourceRequest struct {
	Name       string                  `json:"name"`
	Kind       entity.IncomeSourceKind `json:"kind"`
	GrossCents entity.Money            `json:"gross_cents"`
	NetCents   entity.Money            `json:"net_cents"`
	Recurrence entity.RecurrenceKind   `json:"recurrence"`
	DayOfMonth int                     `json:"day_of_month"`
	FirstMonth string                  `json:"first_month"`
	LastMonth  string                  `json:"last_month"`
}

type CreateIncomeSourceResponse struct {
	IncomeSource entity.IncomeSource `json:"income_source"`
	Err          error               `json:"-"`
}

func (r CreateIncomeSourceResponse) Failed() error { return r.Err }

type UpdateIncomeSourceRequest struct {
	ID         string
	Name       *string                  `json:"name"`
	GrossCents *entity.Money            `json:"gross_cents"`
	NetCents   *entity.Money            `json:"net_cents"`
	Recurrence *entity.RecurrenceKind   `json:"recurrence"`
	DayOfMonth *int                     `json:"day_of_month"`
	FirstMonth *string                  `json:"first_month"`
	LastMonth  *string                  `json:"last_month"`
}

type UpdateIncomeSourceResponse struct {
	IncomeSource entity.IncomeSource `json:"income_source"`
	Err          error               `json:"-"`
}

func (r UpdateIncomeSourceResponse) Failed() error { return r.Err }

type DeactivateIncomeSourceRequest struct{ ID string }

type DeactivateIncomeSourceResponse struct {
	Err error `json:"-"`
}

func (r DeactivateIncomeSourceResponse) Failed() error { return r.Err }

func makeListIncomeSourcesEndpoint(svc service.IncomeSourceService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(ListIncomeSourcesRequest)
		items, err := svc.List(ctx, req.OnlyActive)
		return ListIncomeSourcesResponse{Items: items, Err: err}, nil
	}
}

func makeGetIncomeSourceEndpoint(svc service.IncomeSourceService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(GetIncomeSourceRequest)
		s, err := svc.Get(ctx, req.ID)
		return GetIncomeSourceResponse{IncomeSource: s, Err: err}, nil
	}
}

func makeCreateIncomeSourceEndpoint(svc service.IncomeSourceService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(CreateIncomeSourceRequest)
		s, err := svc.Create(ctx, service.CreateIncomeSourceInput{
			Name: req.Name, Kind: req.Kind, GrossCents: req.GrossCents,
			NetCents: req.NetCents, Recurrence: req.Recurrence, DayOfMonth: req.DayOfMonth,
			FirstMonth: req.FirstMonth, LastMonth: req.LastMonth,
		})
		return CreateIncomeSourceResponse{IncomeSource: s, Err: err}, nil
	}
}

func makeUpdateIncomeSourceEndpoint(svc service.IncomeSourceService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(UpdateIncomeSourceRequest)
		s, err := svc.Update(ctx, req.ID, service.UpdateIncomeSourceInput{
			Name: req.Name, GrossCents: req.GrossCents, NetCents: req.NetCents,
			Recurrence: req.Recurrence, DayOfMonth: req.DayOfMonth,
			FirstMonth: req.FirstMonth, LastMonth: req.LastMonth,
		})
		return UpdateIncomeSourceResponse{IncomeSource: s, Err: err}, nil
	}
}

func makeDeactivateIncomeSourceEndpoint(svc service.IncomeSourceService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(DeactivateIncomeSourceRequest)
		err := svc.Deactivate(ctx, req.ID)
		return DeactivateIncomeSourceResponse{Err: err}, nil
	}
}
