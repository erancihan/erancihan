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

// registerAPI mounts the JSON/image API routes on mux.
func (s *Server) registerAPI(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/folders", s.handleListFolders)
	mux.HandleFunc("POST /api/folders", s.handleRegisterFolder)
	mux.HandleFunc("DELETE /api/folders/{id}", s.handleRemoveFolder)
	mux.HandleFunc("POST /api/scan", s.handleScan)
	mux.HandleFunc("GET /api/duplicates", s.handleDuplicates)
	mux.HandleFunc("POST /api/resolve", s.handleResolve)
	mux.HandleFunc("POST /api/delete", s.handleDelete)
	mux.HandleFunc("GET /api/images/{id}/thumb", s.handleThumb)
	mux.HandleFunc("GET /api/images/{id}/raw", s.handleRaw)
}

// Handler builds the HTTP routes (API + embedded static frontend). Used by the
// `serve` command to run a standalone browser-based GUI.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	s.registerAPI(mux)

	sub, err := StaticFS()
	if err != nil {
		panic(err) // embedded at build time; cannot fail in practice
	}
	mux.Handle("/", http.FileServer(http.FS(sub)))

	return mux
}

// APIHandler returns a handler serving only the JSON/image API, for hosts that
// serve the frontend assets themselves (e.g. the Wails desktop app's asset
// server, which calls this for any request its embedded assets don't satisfy).
func (s *Server) APIHandler() http.Handler {
	mux := http.NewServeMux()
	s.registerAPI(mux)
	return mux
}

// StaticFS returns the embedded frontend assets rooted so index.html is at the
// top level. Shared by the web server and the desktop app.
func StaticFS() (fs.FS, error) {
	return fs.Sub(staticFS, "static")
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
