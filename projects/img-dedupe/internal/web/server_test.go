package web

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/erancihan/img-dedupe/internal/service"
)

func TestServerRoutes(t *testing.T) {
	dir := t.TempDir()
	svc, err := service.New(filepath.Join(dir, "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer svc.Close()

	ts := httptest.NewServer(NewServer(svc, "").Handler())
	defer ts.Close()

	// The embedded frontend is served at the root.
	res, err := http.Get(ts.URL + "/")
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("GET /: status %d", res.StatusCode)
	}

	// Register a folder through the API.
	res, err = http.Post(ts.URL+"/api/folders", "application/json",
		strings.NewReader(`{"path":"`+dir+`"}`))
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("POST /api/folders: status %d", res.StatusCode)
	}

	// It comes back from the list endpoint.
	res, err = http.Get(ts.URL + "/api/folders")
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	var folders []map[string]any
	if err := json.NewDecoder(res.Body).Decode(&folders); err != nil {
		t.Fatal(err)
	}
	if len(folders) != 1 {
		t.Fatalf("got %d folders, want 1", len(folders))
	}
}
