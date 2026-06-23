package http

import (
	"context"
	"fmt"
	"net/http"
	"time"

	kithttp "github.com/go-kit/kit/transport/http"
	"github.com/go-kit/log"
	"github.com/gorilla/mux"
	"github.com/maya/financeiro/endpoint"
)

func RegisterSummaryRoutes(r *mux.Router, ep endpoint.SummaryEndpoints, logger log.Logger) {
	opts := serverOptions(logger)

	r.Handle("/api/v1/summary",
		kithttp.NewServer(ep.GetMonthly, decodeGetMonthlySummaryRequest, EncodeResponse, opts...),
	).Methods(http.MethodGet)
}

func decodeGetMonthlySummaryRequest(_ context.Context, r *http.Request) (interface{}, error) {
	month := r.URL.Query().Get("month")
	if month == "" {
		month = fmt.Sprintf("%d-%02d", time.Now().Year(), time.Now().Month())
	}
	return endpoint.GetMonthlySummaryRequest{Month: month}, nil
}
