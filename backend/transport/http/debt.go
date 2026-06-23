package http

import (
	"context"
	"encoding/json"
	"net/http"

	kithttp "github.com/go-kit/kit/transport/http"
	"github.com/go-kit/log"
	"github.com/gorilla/mux"
	"github.com/maya/financeiro/endpoint"
	"github.com/maya/financeiro/entity"
)

func RegisterDebtRoutes(r *mux.Router, ep endpoint.DebtEndpoints, logger log.Logger) {
	opts := serverOptions(logger)

	r.Handle("/api/v1/debts",
		kithttp.NewServer(ep.List, decodeListDebtsRequest, EncodeResponse, opts...),
	).Methods(http.MethodGet)

	r.Handle("/api/v1/debts",
		kithttp.NewServer(ep.Create, decodeCreateDebtRequest, EncodeResponse, opts...),
	).Methods(http.MethodPost)

	r.Handle("/api/v1/debts/{id}",
		kithttp.NewServer(ep.Get, decodeIDRequest(func(id string) interface{} {
			return endpoint.GetDebtRequest{ID: id}
		}), EncodeResponse, opts...),
	).Methods(http.MethodGet)

	r.Handle("/api/v1/debts/{id}",
		kithttp.NewServer(ep.Update, decodeUpdateDebtRequest, EncodeResponse, opts...),
	).Methods(http.MethodPut)

	r.Handle("/api/v1/debts/{id}",
		kithttp.NewServer(ep.Deactivate, decodeIDRequest(func(id string) interface{} {
			return endpoint.DeactivateDebtRequest{ID: id}
		}), EncodeResponse, opts...),
	).Methods(http.MethodDelete)
}

func decodeListDebtsRequest(_ context.Context, r *http.Request) (interface{}, error) {
	req := endpoint.ListDebtsRequest{
		OnlyActive: r.URL.Query().Get("active") != "false",
	}
	if k := r.URL.Query().Get("kind"); k != "" {
		kind := entity.DebtKind(k)
		req.Kind = &kind
	}
	return req, nil
}

func decodeCreateDebtRequest(_ context.Context, r *http.Request) (interface{}, error) {
	var req endpoint.CreateDebtRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	return req, nil
}

func decodeUpdateDebtRequest(_ context.Context, r *http.Request) (interface{}, error) {
	id := mux.Vars(r)["id"]
	var req endpoint.UpdateDebtRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	req.ID = id
	return req, nil
}
