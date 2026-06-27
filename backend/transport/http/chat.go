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


func RegisterChatRoutes(r *mux.Router, ep endpoint.ChatEndpoints, logger log.Logger) {
	opts := serverOptions(logger)

	r.Handle("/api/v1/chat/status",
		kithttp.NewServer(ep.Status, decodeEmptyRequest, EncodeResponse, opts...),
	).Methods(http.MethodGet)

	r.Handle("/api/v1/chat/message",
		kithttp.NewServer(ep.SendMessage, decodeSendMessageRequest, EncodeResponse, opts...),
	).Methods(http.MethodPost)
}

func decodeSendMessageRequest(_ context.Context, r *http.Request) (interface{}, error) {
	var req endpoint.SendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, err
	}
	return req, nil
}
