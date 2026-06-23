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

func RegisterExpenseRoutes(r *mux.Router, ep endpoint.ExpenseEndpoints, logger log.Logger) {
	opts := serverOptions(logger)

	r.Handle("/api/v1/expenses",
		kithttp.NewServer(ep.List, decodeListExpensesRequest, EncodeResponse, opts...),
	).Methods(http.MethodGet)

	r.Handle("/api/v1/expenses",
		kithttp.NewServer(ep.Create, decodeCreateExpenseRequest, EncodeResponse, opts...),
	).Methods(http.MethodPost)

	r.Handle("/api/v1/expenses/{id}",
		kithttp.NewServer(ep.Get, decodeIDRequest(func(id string) interface{} {
			return endpoint.GetExpenseRequest{ID: id}
		}), EncodeResponse, opts...),
	).Methods(http.MethodGet)

	r.Handle("/api/v1/expenses/{id}",
		kithttp.NewServer(ep.Update, decodeUpdateExpenseRequest, EncodeResponse, opts...),
	).Methods(http.MethodPut)

	r.Handle("/api/v1/expenses/{id}",
		kithttp.NewServer(ep.Deactivate, decodeIDRequest(func(id string) interface{} {
			return endpoint.DeactivateExpenseRequest{ID: id}
		}), EncodeResponse, opts...),
	).Methods(http.MethodDelete)
}

func decodeListExpensesRequest(_ context.Context, r *http.Request) (interface{}, error) {
	req := endpoint.ListExpensesRequest{
		OnlyActive: r.URL.Query().Get("active") != "false",
	}
	if k := r.URL.Query().Get("kind"); k != "" {
		kind := entity.ExpenseKind(k)
		req.Kind = &kind
	}
	return req, nil
}

func decodeCreateExpenseRequest(_ context.Context, r *http.Request) (interface{}, error) {
	var req endpoint.CreateExpenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	return req, nil
}

func decodeUpdateExpenseRequest(_ context.Context, r *http.Request) (interface{}, error) {
	id := mux.Vars(r)["id"]
	var req endpoint.UpdateExpenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	req.ID = id
	return req, nil
}
