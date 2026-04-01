package googleclient

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"

	"golang.org/x/oauth2"
)

// AuthConfig controls where tokens are stored.
type AuthConfig struct {
	Path string
}

// GetClient returns an authenticated HTTP client.
// It looks for a cached token in AuthConfig.Path/token.json,
// falling back to the OAuth2 web flow if no token is found.
func GetClient(config *oauth2.Config, authConfig *AuthConfig) *http.Client {
	if authConfig == nil || authConfig.Path == "" {
		log.Fatal("AuthConfig.Path must be set")
	}

	tokFile := filepath.Join(authConfig.Path, "token.json")

	tok, err := tokenFromFile(tokFile)
	if err != nil {
		tok = getTokenFromWeb(config)
		saveToken(tokFile, tok)
	}

	return config.Client(context.Background(), tok)
}

func tokenFromFile(file string) (*oauth2.Token, error) {
	f, err := os.Open(file)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	tok := &oauth2.Token{}
	err = json.NewDecoder(f).Decode(tok)
	return tok, err
}

func saveToken(path string, token *oauth2.Token) {
	fmt.Printf("Saving credential file to: %s\n", path)

	// Ensure the parent directory exists
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		log.Fatalf("Unable to create directory for token: %v", err)
	}

	f, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		log.Fatalf("Unable to cache oauth token: %v", err)
	}
	defer f.Close()

	if err := json.NewEncoder(f).Encode(token); err != nil {
		log.Fatalf("Unable to write oauth token: %v", err)
	}
}

func getTokenFromWeb(config *oauth2.Config) *oauth2.Token {
	codeCh := make(chan string)

	// Use a dedicated ServeMux to avoid polluting the default mux
	mux := http.NewServeMux()
	server := &http.Server{Addr: ":8080", Handler: mux}

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		if code != "" {
			fmt.Fprint(w, "Login successful! You can close this tab now.")
			codeCh <- code
		} else {
			fmt.Fprint(w, "Error: No code found.")
		}
	})

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start local server: %v", err)
		}
	}()

	config.RedirectURL = "http://localhost:8080"
	authURL := config.AuthCodeURL("state-token", oauth2.AccessTypeOffline)

	fmt.Println("Opening browser for authentication...")
	openBrowser(authURL)

	authCode := <-codeCh

	go server.Shutdown(context.Background())

	tok, err := config.Exchange(context.TODO(), authCode)
	if err != nil {
		log.Fatalf("Unable to retrieve token from web: %v", err)
	}
	return tok
}

// openBrowser opens the given URL in the default browser (cross-platform).
func openBrowser(url string) {
	var err error
	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", url).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = fmt.Errorf("unsupported platform")
	}
	if err != nil {
		fmt.Printf("Could not open browser automatically. Please visit: %s\n", url)
	}
}
