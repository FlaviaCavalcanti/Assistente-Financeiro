package http

import (
	"context"
	"net/http"

	kithttp "github.com/go-kit/kit/transport/http"
	"github.com/go-kit/log"
	"github.com/gorilla/mux"
)

func serverOptions(logger log.Logger) []kithttp.ServerOption {
	return []kithttp.ServerOption{
		kithttp.ServerErrorEncoder(EncodeError),
		kithttp.ServerErrorLogger(logger),
	}
}

// decodeEmptyRequest é usado para endpoints sem body (ex.: List).
func decodeEmptyRequest(_ context.Context, _ *http.Request) (interface{}, error) {
	return struct{}{}, nil
}

// decodeIDRequest extrai o {id} do path e constrói o request via factory fn.
func decodeIDRequest(factory func(id string) interface{}) kithttp.DecodeRequestFunc {
	return func(_ context.Context, r *http.Request) (interface{}, error) {
		id := mux.Vars(r)["id"]
		return factory(id), nil
	}
}
