package http

import (
	"net/http"
	"time"

	"github.com/go-kit/log"
	"github.com/gorilla/mux"
)

func LoggingMiddleware(logger log.Logger) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}
			defer func(begin time.Time) {
				logger.Log(
					"method", r.Method,
					"path", r.URL.Path,
					"status", rw.status,
					"took", time.Since(begin),
				)
			}(time.Now())
			next.ServeHTTP(rw, r)
		})
	}
}

// responseWriter captura o status code para o log.
type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}
