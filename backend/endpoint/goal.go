package endpoint

import (
	"context"

	"github.com/go-kit/kit/endpoint"
	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/service"
)

type GoalEndpoints struct {
	List       endpoint.Endpoint
	Get        endpoint.Endpoint
	Create     endpoint.Endpoint
	Update     endpoint.Endpoint
	Contribute endpoint.Endpoint
	Deactivate endpoint.Endpoint
}

func MakeGoalEndpoints(svc service.GoalService) GoalEndpoints {
	return GoalEndpoints{
		List:       makeListGoalsEndpoint(svc),
		Get:        makeGetGoalEndpoint(svc),
		Create:     makeCreateGoalEndpoint(svc),
		Update:     makeUpdateGoalEndpoint(svc),
		Contribute: makeContributeGoalEndpoint(svc),
		Deactivate: makeDeactivateGoalEndpoint(svc),
	}
}

// --- List ---

type ListGoalsRequest struct{ OnlyActive bool }

type ListGoalsResponse struct {
	Items []entity.Goal `json:"items"`
	Err   error         `json:"-"`
}

func (r ListGoalsResponse) Failed() error { return r.Err }

// --- Get ---

type GetGoalRequest struct{ ID string }

type GetGoalResponse struct {
	Goal entity.Goal `json:"goal"`
	Err  error       `json:"-"`
}

func (r GetGoalResponse) Failed() error { return r.Err }

// --- Create ---

type CreateGoalRequest struct {
	Name         string          `json:"name"`
	Kind         entity.GoalKind `json:"kind"`
	TargetCents  entity.Money    `json:"target_cents"`
	TargetMonths int             `json:"target_months"`
	CurrentCents entity.Money    `json:"current_cents"`
	Deadline     string          `json:"deadline"`
	Icon         string          `json:"icon"`
	Color        string          `json:"color"`
}

type CreateGoalResponse struct {
	Goal entity.Goal `json:"goal"`
	Err  error       `json:"-"`
}

func (r CreateGoalResponse) Failed() error { return r.Err }

// --- Update ---

type UpdateGoalRequest struct {
	ID           string
	Name         *string          `json:"name"`
	TargetCents  *entity.Money    `json:"target_cents"`
	TargetMonths *int             `json:"target_months"`
	CurrentCents *entity.Money    `json:"current_cents"`
	Deadline     *string          `json:"deadline"`
	Icon         *string          `json:"icon"`
	Color        *string          `json:"color"`
}

type UpdateGoalResponse struct {
	Goal entity.Goal `json:"goal"`
	Err  error       `json:"-"`
}

func (r UpdateGoalResponse) Failed() error { return r.Err }

// --- Contribute ---

type ContributeGoalRequest struct {
	ID          string
	AmountCents entity.Money `json:"amount_cents"`
}

type ContributeGoalResponse struct {
	Goal entity.Goal `json:"goal"`
	Err  error       `json:"-"`
}

func (r ContributeGoalResponse) Failed() error { return r.Err }

// --- Deactivate ---

type DeactivateGoalRequest struct{ ID string }

type DeactivateGoalResponse struct {
	Err error `json:"-"`
}

func (r DeactivateGoalResponse) Failed() error { return r.Err }

// --- Endpoint makers ---

func makeListGoalsEndpoint(svc service.GoalService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(ListGoalsRequest)
		items, err := svc.List(ctx, req.OnlyActive)
		return ListGoalsResponse{Items: items, Err: err}, nil
	}
}

func makeGetGoalEndpoint(svc service.GoalService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(GetGoalRequest)
		g, err := svc.Get(ctx, req.ID)
		return GetGoalResponse{Goal: g, Err: err}, nil
	}
}

func makeCreateGoalEndpoint(svc service.GoalService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(CreateGoalRequest)
		g, err := svc.Create(ctx, service.CreateGoalInput{
			Name:         req.Name,
			Kind:         req.Kind,
			TargetCents:  req.TargetCents,
			TargetMonths: req.TargetMonths,
			CurrentCents: req.CurrentCents,
			Deadline:     req.Deadline,
			Icon:         req.Icon,
			Color:        req.Color,
		})
		return CreateGoalResponse{Goal: g, Err: err}, nil
	}
}

func makeUpdateGoalEndpoint(svc service.GoalService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(UpdateGoalRequest)
		g, err := svc.Update(ctx, req.ID, service.UpdateGoalInput{
			Name:         req.Name,
			TargetCents:  req.TargetCents,
			TargetMonths: req.TargetMonths,
			CurrentCents: req.CurrentCents,
			Deadline:     req.Deadline,
			Icon:         req.Icon,
			Color:        req.Color,
		})
		return UpdateGoalResponse{Goal: g, Err: err}, nil
	}
}

func makeContributeGoalEndpoint(svc service.GoalService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(ContributeGoalRequest)
		g, err := svc.Contribute(ctx, req.ID, req.AmountCents)
		return ContributeGoalResponse{Goal: g, Err: err}, nil
	}
}

func makeDeactivateGoalEndpoint(svc service.GoalService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(DeactivateGoalRequest)
		err := svc.Deactivate(ctx, req.ID)
		return DeactivateGoalResponse{Err: err}, nil
	}
}
