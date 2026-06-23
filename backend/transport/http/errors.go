package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/maya/financeiro/entity"
)

type errorResponse struct {
	Error errorBody `json:"error"`
}

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// EncodeError traduz erros de domínio para HTTP status codes.
// É o único lugar no codebase que conhece essa tradução.
func EncodeError(_ context.Context, err error, w http.ResponseWriter) {
	code := "INTERNAL_ERROR"
	status := http.StatusInternalServerError

	switch {
	case errors.Is(err, entity.ErrNotFound):
		code, status = "NOT_FOUND", http.StatusNotFound
	case errors.Is(err, entity.ErrInvalidMoney),
		errors.Is(err, entity.ErrInvalidDay):
		code, status = "VALIDATION_ERROR", http.StatusUnprocessableEntity
	case errors.Is(err, entity.ErrConflict),
		errors.Is(err, entity.ErrSystemCategory),
		errors.Is(err, entity.ErrHasDependencies):
		code, status = "CONFLICT", http.StatusConflict
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(errorResponse{
		Error: errorBody{Code: code, Message: err.Error()},
	})
}

// EncodeResponse codifica qualquer resposta bem-sucedida em JSON.
func EncodeResponse(ctx context.Context, w http.ResponseWriter, response interface{}) error {
	// Verifica se a resposta tem um erro de domínio embutido.
	type failer interface{ Failed() error }
	if f, ok := response.(failer); ok {
		if err := f.Failed(); err != nil {
			EncodeError(ctx, err, w)
			return nil
		}
	}
	w.Header().Set("Content-Type", "application/json")
	return json.NewEncoder(w).Encode(response)
}
