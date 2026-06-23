package http

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	kithttp "github.com/go-kit/kit/transport/http"
	"github.com/go-kit/log"
	"github.com/gorilla/mux"
	"github.com/maya/financeiro/endpoint"
	"github.com/maya/financeiro/entity"
)

func RegisterTransactionRoutes(r *mux.Router, ep endpoint.TransactionEndpoints, logger log.Logger) {
	opts := serverOptions(logger)

	r.Handle("/api/v1/transactions",
		kithttp.NewServer(ep.List, decodeListTransactionsRequest, EncodeResponse, opts...),
	).Methods(http.MethodGet)

	r.Handle("/api/v1/transactions",
		kithttp.NewServer(ep.Create, decodeCreateTransactionRequest, EncodeResponse, opts...),
	).Methods(http.MethodPost)

	r.Handle("/api/v1/transactions/{id}",
		kithttp.NewServer(ep.Get, decodeIDRequest(func(id string) interface{} {
			return endpoint.GetTransactionRequest{ID: id}
		}), EncodeResponse, opts...),
	).Methods(http.MethodGet)

	r.Handle("/api/v1/transactions/{id}",
		kithttp.NewServer(ep.Update, decodeUpdateTransactionRequest, EncodeResponse, opts...),
	).Methods(http.MethodPut)

	r.Handle("/api/v1/transactions/{id}",
		kithttp.NewServer(ep.Delete, decodeIDRequest(func(id string) interface{} {
			return endpoint.DeleteTransactionRequest{ID: id}
		}), EncodeResponse, opts...),
	).Methods(http.MethodDelete)
}

func decodeListTransactionsRequest(_ context.Context, r *http.Request) (interface{}, error) {
	q := r.URL.Query()
	req := endpoint.ListTransactionsRequest{}

	if v := q.Get("from"); v != "" {
		t, err := time.Parse("2006-01-02", v)
		if err == nil {
			req.From = &t
		}
	}
	if v := q.Get("to"); v != "" {
		t, err := time.Parse("2006-01-02", v)
		if err == nil {
			req.To = &t
		}
	}
	if v := q.Get("category_id"); v != "" {
		req.CategoryID = &v
	}
	if v := q.Get("direction"); v != "" {
		d := entity.TransactionDirection(v)
		req.Direction = &d
	}
	if v := q.Get("page"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			req.Page = n
		}
	}
	if v := q.Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			req.Limit = n
		}
	}
	return req, nil
}

func decodeCreateTransactionRequest(_ context.Context, r *http.Request) (interface{}, error) {
	var req endpoint.CreateTransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	return req, nil
}

func decodeUpdateTransactionRequest(_ context.Context, r *http.Request) (interface{}, error) {
	id := mux.Vars(r)["id"]
	var req endpoint.UpdateTransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	req.ID = id
	return req, nil
}
