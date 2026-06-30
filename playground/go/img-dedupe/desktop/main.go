//go:build desktop

// Command imgdedupe-gui is the native desktop GUI for img-dedupe, built with
// Wails. It reuses the exact same service core and embedded web frontend as the
// CLI and the `serve` command: Wails hosts the frontend in a native webview and
// routes its /api/* requests to the in-process API handler, so no browser and
// no separate bindings layer are needed.
//
// Build (Linux, webkit2gtk-4.1):
//
//	go build -tags 'desktop webkit2_41' -o imgdedupe-gui ./desktop
//
// It lives behind the `desktop` build tag so the rest of the module continues to
// build and test without the native webview toolchain installed.
package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/erancihan/img-dedupe/internal/service"
	"github.com/erancihan/img-dedupe/internal/web"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

func main() {
	dbPath, err := defaultDBPath()
	if err != nil {
		log.Fatalf("could not determine database path: %v", err)
	}

	svc, err := service.New(dbPath)
	if err != nil {
		log.Fatalf("failed to open database at %s: %v", dbPath, err)
	}
	defer svc.Close()

	assets, err := web.StaticFS()
	if err != nil {
		log.Fatalf("failed to load frontend assets: %v", err)
	}

	app := &options.App{
		Title:  "img-dedupe",
		Width:  1100,
		Height: 800,
		AssetServer: &assetserver.Options{
			// Wails serves these embedded assets (index.html) and forwards any
			// request they don't satisfy (the /api/* calls) to Handler.
			Assets:  assets,
			Handler: web.NewServer(svc, "").APIHandler(),
		},
	}

	if err := wails.Run(app); err != nil {
		log.Fatalf("wails: %v", err)
	}
}

// defaultDBPath stores the database under the user's config directory so it
// persists across runs, with an IMGDEDUPE_DB override.
func defaultDBPath() (string, error) {
	if v := os.Getenv("IMGDEDUPE_DB"); v != "" {
		return v, nil
	}
	cfg, err := os.UserConfigDir()
	if err != nil {
		return "imgdedupe.db", nil
	}
	dir := filepath.Join(cfg, "imgdedupe")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return filepath.Join(dir, "imgdedupe.db"), nil
}
