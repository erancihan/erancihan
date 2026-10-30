package main

import (
	"context"
	"fmt"
	"gmail-tui/internal/application"
	googleclient "gmail-tui/internal/google-client"
	"log"
	"os"
	"path/filepath"

	tea "github.com/charmbracelet/bubbletea"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"
)

// secretsDir picks where credentials.json and token.json live:
// $GMAIL_TUI_HOME, else ./secrets if it holds credentials, else ~/.config/gmail-tui.
func secretsDir() string {
	if dir := os.Getenv("GMAIL_TUI_HOME"); dir != "" {
		return dir
	}
	if _, err := os.Stat(filepath.Join("secrets", "credentials.json")); err == nil {
		return "secrets"
	}
	dir, err := os.UserConfigDir()
	if err != nil {
		return "secrets"
	}
	return filepath.Join(dir, "gmail-tui")
}

func main() {
	// 1. Setup Google Client
	ctx := context.Background()
	dir := secretsDir()
	b, err := os.ReadFile(filepath.Join(dir, "credentials.json"))
	if err != nil {
		log.Fatalf("Unable to read client secret file: %v\nPlace credentials.json in %s (see README).", err, dir)
	}

	config, err := google.ConfigFromJSON(b, gmail.GmailReadonlyScope)
	if err != nil {
		log.Fatalf("Unable to parse client secret file: %v", err)
	}
	client, err := googleclient.GetClient(ctx, config, filepath.Join(dir, "token.json"))
	if err != nil {
		log.Fatalf("Unable to log in: %v", err)
	}
	srv, err := gmail.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		log.Fatalf("Unable to retrieve Gmail client: %v", err)
	}

	// 2. Run Bubble Tea Program
	m := application.NewApplication(srv)
	if _, err := tea.NewProgram(m, tea.WithAltScreen()).Run(); err != nil {
		fmt.Println("Error running program:", err)
		os.Exit(1)
	}
}
