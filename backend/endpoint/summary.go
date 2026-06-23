package endpoint

import (
	"context"

	"github.com/go-kit/kit/endpoint"
	"github.com/maya/financeiro/entity"
	"github.com/maya/financeiro/service"
)

type SummaryEndpoints struct {
	GetMonthly endpoint.Endpoint
}

func MakeSummaryEndpoints(svc service.SummaryService) SummaryEndpoints {
	return SummaryEndpoints{
		GetMonthly: makeGetMonthlySummaryEndpoint(svc),
	}
}

type GetMonthlySummaryRequest struct {
	Month string // "YYYY-MM"
}

type GetMonthlySummaryResponse struct {
	Summary entity.Summary `json:"summary"`
	Err     error          `json:"-"`
}

func (r GetMonthlySummaryResponse) Failed() error { return r.Err }

func makeGetMonthlySummaryEndpoint(svc service.SummaryService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(GetMonthlySummaryRequest)
		s, err := svc.GetMonthly(ctx, req.Month)
		return GetMonthlySummaryResponse{Summary: s, Err: err}, nil
	}
}
