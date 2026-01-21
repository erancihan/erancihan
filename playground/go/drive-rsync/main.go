package main

import (
	"context"
	"drive-rsync/internal/application"
	googleclient "drive-rsync/internal/google-client"
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/cobra"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
)

// Global Drive Service (In a real app, inject this)
var (
	credentialsPath string
)

var rootCmd = &cobra.Command{
	Use:   "gdrsync",
	Short: "Google Drive Rsync Clone",
	Long:  `A CLI tool to synchronize local directories with Google Drive.`,
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
		var err error

		ctx := context.Background()

		// if credentialsPath is not set, use default
		if credentialsPath == "" {
			credentialsPath = "secrets/credentials.json"
		}

		// convert credentialsPath to absolute path
		credentialsPath, err = filepath.Abs(credentialsPath)
		if err != nil {
			return fmt.Errorf("failed to get absolute path of credentials: %w", err)
		}

		if _, err := os.Stat(credentialsPath); os.IsNotExist(err) {
			return fmt.Errorf("credentials file '%s' does not exist", credentialsPath)
		}

		secrets, err := os.ReadFile(credentialsPath)
		if err != nil {
			return fmt.Errorf("unable to read client secret file: %v", err)
		}

		config, err := google.ConfigFromJSON(secrets, drive.DriveScope)
		if err != nil {
			return fmt.Errorf("unable to parse client secret file: %v", err)
		}
		client := googleclient.GetClient(config, &googleclient.AuthConfig{Path: filepath.Dir(credentialsPath)})

		// Pass the flag value (credentialsPath) to your auth setup
		application.DriveService, err = drive.NewService(ctx, option.WithHTTPClient(client))
		if err != nil {
			return fmt.Errorf("failed to authenticate using '%s': %w", credentialsPath, err)
		}

		fmt.Println("Authenticated successfully")

		return nil
	},
}

func init() {
	rootCmd.PersistentFlags().StringVarP(&credentialsPath, "credentials", "c", "credentials.json", "path to google credentials.json")

	rootCmd.AddCommand(application.InitCommand())
	rootCmd.AddCommand(application.SyncCommand())
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
