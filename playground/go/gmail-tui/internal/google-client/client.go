package googleclient

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"time"

	"gmail-tui/internal/browser"

	"golang.org/x/oauth2"
)

// --- GOOGLE AUTH ---
// GetClient loads the cached token from tokFile, refreshing it or running the
// browser login when it is missing or no longer valid.
func GetClient(ctx context.Context, config *oauth2.Config, tokFile string) (*http.Client, error) {
	tok, err := tokenFromFile(tokFile)
	if err == nil {
		// Refresh tokens of apps in "Testing" expire after 7 days; detect that up front.
		if _, err := config.TokenSource(ctx, tok).Token(); err != nil {
			fmt.Printf("Saved login is no longer valid (%v), logging in again.\n", err)
			tok = nil
		}
	} else {
		tok = nil
	}

	if tok == nil {
		tok, err = tokenFromWeb(ctx, config)
		if err != nil {
			return nil, err
		}
		if err := saveToken(tokFile, tok); err != nil {
			return nil, err
		}
	}
	return config.Client(ctx, tok), nil
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

func saveToken(path string, token *oauth2.Token) error {
	fmt.Printf("Saving credential file to: %s\n", path)
	f, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		return fmt.Errorf("unable to cache oauth token: %w", err)
	}
	defer f.Close()
	return json.NewEncoder(f).Encode(token)
}

// tokenFromWeb runs the OAuth loopback flow: a one-shot server on a free local
// port receives the redirect. Desktop app clients accept any loopback port.
func tokenFromWeb(ctx context.Context, config *oauth2.Config) (*oauth2.Token, error) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, fmt.Errorf("failed to start local server: %w", err)
	}
	config.RedirectURL = fmt.Sprintf("http://127.0.0.1:%d", ln.Addr().(*net.TCPAddr).Port)

	stateBytes := make([]byte, 16)
	rand.Read(stateBytes)
	state := hex.EncodeToString(stateBytes)

	type result struct {
		code string
		err  error
	}
	resCh := make(chan result, 1)
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		var res result
		switch {
		case q.Get("state") != state:
			http.Error(w, "Error: state mismatch.", http.StatusBadRequest)
			return
		case q.Get("error") != "":
			res.err = fmt.Errorf("login refused: %s", q.Get("error"))
			fmt.Fprint(w, "Login failed. You can close this tab now.")
		case q.Get("code") == "":
			http.Error(w, "Error: no code found.", http.StatusBadRequest)
			return
		default:
			res.code = q.Get("code")
			fmt.Fprint(w, "Login successful! You can close this tab now.")
		}
		select {
		case resCh <- res:
		default:
		}
	})
	server := &http.Server{Handler: mux}
	go server.Serve(ln)
	defer server.Shutdown(context.Background())

	authURL := config.AuthCodeURL(state, oauth2.AccessTypeOffline)
	fmt.Printf("Log in to Google in your browser. If it does not open, visit:\n%s\n", authURL)
	browser.Open(authURL)

	var res result
	select {
	case res = <-resCh:
	case <-time.After(5 * time.Minute):
		return nil, errors.New("timed out waiting for login")
	}
	if res.err != nil {
		return nil, res.err
	}

	tok, err := config.Exchange(ctx, res.code)
	if err != nil {
		return nil, fmt.Errorf("unable to retrieve token from web: %w", err)
	}
	return tok, nil
}
