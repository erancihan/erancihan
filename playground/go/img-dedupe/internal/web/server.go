// Package web exposes the img-dedupe service over HTTP: a small JSON API plus an
// embedded single-page frontend.
package web

import (
	"context"
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"net/http"
	"time"

	"github.com/erancihan/img-dedupe/internal/service"
)

//go:embed static
var staticFS embed.FS

// Server serves the JSON API and the embedded frontend, backed by the shared
// service.
type Server struct {
	svc  *service.Service
	addr string
}

// NewServer returns a Server bound to addr.
func NewServer(svc *service.Service, addr string) *Server {
	return &Server{svc: svc, addr: addr}
}

// Handler builds the HTTP routes (API + embedded static frontend).
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/folders", s.handleListFolders)
	mux.HandleFunc("POST /api/folders", s.handleRegisterFolder)
	mux.HandleFunc("DELETE /api/folders/{id}", s.handleRemoveFolder)
	mux.HandleFunc("POST /api/scan", s.handleScan)
	mux.HandleFunc("GET /api/duplicates", s.handleDuplicates)
	mux.HandleFunc("POST /api/resolve", s.handleResolve)
	mux.HandleFunc("POST /api/delete", s.handleDelete)
	mux.HandleFunc("GET /api/images/{id}/thumb", s.handleThumb)
	mux.HandleFunc("GET /api/images/{id}/raw", s.handleRaw)

	// Embedded single-page frontend.
	sub, err := fs.Sub(staticFS, "static")
	if err != nil {
		panic(err) // embedded at build time; cannot fail in practice
	}
	mux.Handle("/", http.FileServer(http.FS(sub)))

	return mux
}

// ListenAndServe starts the server and blocks until ctx is cancelled, then
// shuts down gracefully.
func (s *Server) ListenAndServe(ctx context.Context) error {
	srv := &http.Server{
		Addr:              s.addr,
		Handler:           s.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		err := srv.ListenAndServe()
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
			return
		}
		errCh <- nil
	}()

	fmt.Printf("img-dedupe GUI on http://%s\n", s.addr)

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		fmt.Println("\nShutting down...")
		return srv.Shutdown(shutdownCtx)
	case err := <-errCh:
		return err
	}
}
