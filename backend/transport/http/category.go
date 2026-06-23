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

func RegisterCategoryRoutes(r *mux.Router, ep endpoint.CategoryEndpoints, logger log.Logger) {
	opts := serverOptions(logger)

	r.Handle("/api/v1/categories",
		kithttp.NewServer(ep.List, decodeEmptyRequest, EncodeResponse, opts...),
	).Methods(http.MethodGet)

	r.Handle("/api/v1/categories",
		kithttp.NewServer(ep.Create, decodeCreateCategoryRequest, EncodeResponse, opts...),
	).Methods(http.MethodPost)

	r.Handle("/api/v1/categories/{id}",
		kithttp.NewServer(ep.Get, decodeIDRequest(func(id string) interface{} {
			return endpoint.GetCategoryRequest{ID: id}
		}), EncodeResponse, opts...),
	).Methods(http.MethodGet)

	r.Handle("/api/v1/categories/{id}",
		kithttp.NewServer(ep.Update, decodeUpdateCategoryRequest, EncodeResponse, opts...),
	).Methods(http.MethodPut)

	r.Handle("/api/v1/categories/{id}",
		kithttp.NewServer(ep.Delete, decodeIDRequest(func(id string) interface{} {
			return endpoint.DeleteCategoryRequest{ID: id}
		}), EncodeResponse, opts...),
	).Methods(http.MethodDelete)
}

func decodeCreateCategoryRequest(_ context.Context, r *http.Request) (interface{}, error) {
	var req endpoint.CreateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	return req, nil
}

func decodeUpdateCategoryRequest(_ context.Context, r *http.Request) (interface{}, error) {
	id := mux.Vars(r)["id"]
	var req endpoint.UpdateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	req.ID = id
	return req, nil
}
