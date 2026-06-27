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

func RegisterGoalRoutes(r *mux.Router, ep endpoint.GoalEndpoints, logger log.Logger) {
	opts := serverOptions(logger)

	r.Handle("/api/v1/goals",
		kithttp.NewServer(ep.List, decodeListGoalsRequest, EncodeResponse, opts...),
	).Methods(http.MethodGet)

	r.Handle("/api/v1/goals",
		kithttp.NewServer(ep.Create, decodeCreateGoalRequest, EncodeResponse, opts...),
	).Methods(http.MethodPost)

	r.Handle("/api/v1/goals/{id}",
		kithttp.NewServer(ep.Get, decodeIDRequest(func(id string) interface{} {
			return endpoint.GetGoalRequest{ID: id}
		}), EncodeResponse, opts...),
	).Methods(http.MethodGet)

	r.Handle("/api/v1/goals/{id}",
		kithttp.NewServer(ep.Update, decodeUpdateGoalRequest, EncodeResponse, opts...),
	).Methods(http.MethodPut)

	r.Handle("/api/v1/goals/{id}/contribute",
		kithttp.NewServer(ep.Contribute, decodeContributeGoalRequest, EncodeResponse, opts...),
	).Methods(http.MethodPost)

	r.Handle("/api/v1/goals/{id}",
		kithttp.NewServer(ep.Deactivate, decodeIDRequest(func(id string) interface{} {
			return endpoint.DeactivateGoalRequest{ID: id}
		}), EncodeResponse, opts...),
	).Methods(http.MethodDelete)
}

func decodeListGoalsRequest(_ context.Context, r *http.Request) (interface{}, error) {
	return endpoint.ListGoalsRequest{
		OnlyActive: r.URL.Query().Get("active") != "false",
	}, nil
}

func decodeCreateGoalRequest(_ context.Context, r *http.Request) (interface{}, error) {
	var req endpoint.CreateGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	return req, nil
}

func decodeUpdateGoalRequest(_ context.Context, r *http.Request) (interface{}, error) {
	id := mux.Vars(r)["id"]
	var req endpoint.UpdateGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	req.ID = id
	return req, nil
}

func decodeContributeGoalRequest(_ context.Context, r *http.Request) (interface{}, error) {
	id := mux.Vars(r)["id"]
	var req endpoint.ContributeGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	req.ID = id
	return req, nil
}
