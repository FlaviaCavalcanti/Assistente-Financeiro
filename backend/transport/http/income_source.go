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

func RegisterIncomeSourceRoutes(r *mux.Router, ep endpoint.IncomeSourceEndpoints, logger log.Logger) {
	opts := serverOptions(logger)

	r.Handle("/api/v1/income-sources",
		kithttp.NewServer(ep.List, decodeListIncomeSourcesRequest, EncodeResponse, opts...),
	).Methods(http.MethodGet)

	r.Handle("/api/v1/income-sources",
		kithttp.NewServer(ep.Create, decodeCreateIncomeSourceRequest, EncodeResponse, opts...),
	).Methods(http.MethodPost)

	r.Handle("/api/v1/income-sources/{id}",
		kithttp.NewServer(ep.Get, decodeIDRequest(func(id string) interface{} {
			return endpoint.GetIncomeSourceRequest{ID: id}
		}), EncodeResponse, opts...),
	).Methods(http.MethodGet)

	r.Handle("/api/v1/income-sources/{id}",
		kithttp.NewServer(ep.Update, decodeUpdateIncomeSourceRequest, EncodeResponse, opts...),
	).Methods(http.MethodPut)

	r.Handle("/api/v1/income-sources/{id}",
		kithttp.NewServer(ep.Deactivate, decodeIDRequest(func(id string) interface{} {
			return endpoint.DeactivateIncomeSourceRequest{ID: id}
		}), EncodeResponse, opts...),
	).Methods(http.MethodDelete)
}

func decodeListIncomeSourcesRequest(_ context.Context, r *http.Request) (interface{}, error) {
	onlyActive := r.URL.Query().Get("active") != "false"
	return endpoint.ListIncomeSourcesRequest{OnlyActive: onlyActive}, nil
}

func decodeCreateIncomeSourceRequest(_ context.Context, r *http.Request) (interface{}, error) {
	var req endpoint.CreateIncomeSourceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	return req, nil
}

func decodeUpdateIncomeSourceRequest(_ context.Context, r *http.Request) (interface{}, error) {
	id := mux.Vars(r)["id"]
	var req endpoint.UpdateIncomeSourceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	req.ID = id
	return req, nil
}
