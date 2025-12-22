package main

import (
	"context"
	"fmt"
	"gmail-tui/internal/application"
	googleclient "gmail-tui/internal/google-client"
	"log"
	"os"

	tea "github.com/charmbracelet/bubbletea"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"
)

func main() {
	// 1. Setup Google Client
	ctx := context.Background()
	b, err := os.ReadFile("secrets/credentials.json")
	if err != nil {
		log.Fatalf("Unable to read client secret file: %v", err)
	}

	config, err := google.ConfigFromJSON(b, gmail.GmailReadonlyScope)
	if err != nil {
		log.Fatalf("Unable to parse client secret file: %v", err)
	}
	client := googleclient.GetClient(config)
	srv, err := gmail.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		log.Fatalf("Unable to retrieve Gmail client: %v", err)
	}

	// 3. Run Bubble Tea Program
	m := application.NewApplication(srv)
	if _, err := tea.NewProgram(m).Run(); err != nil {
		fmt.Println("Error running program:", err)
		os.Exit(1)
	}
}
