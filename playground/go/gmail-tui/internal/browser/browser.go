package browser

import (
	"errors"
	"os/exec"
	"runtime"
)

// Open opens url in the default browser. Output of the opener is discarded so
// it cannot draw over a running TUI.
func Open(url string) error {
	var candidates [][]string
	switch runtime.GOOS {
	case "linux":
		candidates = [][]string{{"xdg-open", url}, {"wslview", url}}
	case "windows":
		candidates = [][]string{{"rundll32", "url.dll,FileProtocolHandler", url}}
	case "darwin":
		candidates = [][]string{{"open", url}}
	}
	for _, c := range candidates {
		if _, err := exec.LookPath(c[0]); err != nil {
			continue
		}
		if err := exec.Command(c[0], c[1:]...).Start(); err == nil {
			return nil
		}
	}
	return errors.New("no browser opener found")
}
