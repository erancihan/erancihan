package googleclient

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"runtime"

	"golang.org/x/oauth2"
)

// --- GOOGLE AUTH BOILERPLATE ---
// Retrieve a token, saves the token, then returns the generated client.
func GetClient(config *oauth2.Config) *http.Client {
	tokFile := "secrets/token.json"
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
	f, err := os.OpenFile(path, os.O_RDWR|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		log.Fatalf("Unable to cache oauth token: %v", err)
	}
	defer f.Close()
	json.NewEncoder(f).Encode(token)
}

func getTokenFromWeb(config *oauth2.Config) *oauth2.Token {
	// 1. Create a channel to receive the auth code from the web server
	codeCh := make(chan string)

	// 2. Create a local server to listen for the callback
	// NOTE: Ensure "http://localhost:8080" is added to your Authorized Redirect URIs in Google Cloud Console
	server := &http.Server{Addr: ":8080"}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Get the code from the query string
		code := r.URL.Query().Get("code")
		if code != "" {
			// Tell the user it was successful
			fmt.Fprint(w, "Login successful! You can close this tab now.")
			// Send code to the channel
			codeCh <- code
		} else {
			fmt.Fprint(w, "Error: No code found.")
		}
	})

	// 3. Start the server in a goroutine
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start local server: %v", err)
		}
	}()

	// 4. Construct the Auth URL with the redirect to localhost
	config.RedirectURL = "http://localhost:8080"
	authURL := config.AuthCodeURL("state-token", oauth2.AccessTypeOffline)

	// 5. Open the browser automatically
	fmt.Println("Opening browser for authentication...")
	openBrowser(authURL)

	// 6. Wait for the code
	authCode := <-codeCh

	// 7. Shut down the server nicely
	go server.Shutdown(context.Background())

	// 8. Exchange the code for a token
	tok, err := config.Exchange(context.TODO(), authCode)
	if err != nil {
		log.Fatalf("Unable to retrieve token from web: %v", err)
	}
	return tok
}

// Helper to open the browser on different OSs
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
