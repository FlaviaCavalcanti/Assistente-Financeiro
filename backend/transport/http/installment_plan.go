package http

import (
	"context"
	"encoding/json"
	"net/http"

	kithttp "github.com/go-kit/kit/transport/http"
	"github.com/go-kit/log"
	"github.com/gorilla/mux"
	"github.com/maya/financeiro/endpoint"
)

func RegisterInstallmentPlanRoutes(r *mux.Router, ep endpoint.InstallmentPlanEndpoints, logger log.Logger) {
	opts := serverOptions(logger)

	r.Handle("/api/v1/installment-plans",
		kithttp.NewServer(ep.List, decodeListInstallmentPlansRequest, EncodeResponse, opts...),
	).Methods(http.MethodGet)

	r.Handle("/api/v1/installment-plans",
		kithttp.NewServer(ep.Create, decodeCreateInstallmentPlanRequest, EncodeResponse, opts...),
	).Methods(http.MethodPost)

	r.Handle("/api/v1/installment-plans/{id}",
		kithttp.NewServer(ep.Get, decodeIDRequest(func(id string) interface{} {
			return endpoint.GetInstallmentPlanRequest{ID: id}
		}), EncodeResponse, opts...),
	).Methods(http.MethodGet)

	r.Handle("/api/v1/installment-plans/{id}/pay",
		kithttp.NewServer(ep.MarkPaid, decodeIDRequest(func(id string) interface{} {
			return endpoint.MarkInstallmentPaidRequest{ID: id}
		}), EncodeResponse, opts...),
	).Methods(http.MethodPut)

	r.Handle("/api/v1/installment-plans/{id}",
		kithttp.NewServer(ep.Deactivate, decodeIDRequest(func(id string) interface{} {
			return endpoint.DeactivateInstallmentPlanRequest{ID: id}
		}), EncodeResponse, opts...),
	).Methods(http.MethodDelete)
}

func decodeListInstallmentPlansRequest(_ context.Context, r *http.Request) (interface{}, error) {
	onlyActive := r.URL.Query().Get("active") != "false"
	return endpoint.ListInstallmentPlansRequest{OnlyActive: onlyActive}, nil
}

func decodeCreateInstallmentPlanRequest(_ context.Context, r *http.Request) (interface{}, error) {
	var req endpoint.CreateInstallmentPlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	return req, nil
}
