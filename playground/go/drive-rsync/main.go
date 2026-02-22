package main

import (
	"context"
	"drive-rsync/internal/application"
	"drive-rsync/internal/config"
	googleclient "drive-rsync/internal/google-client"
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
)

var (
	credentialsPath string
	dataDir         string
	devMode         bool
)

var rootCmd = &cobra.Command{
	Use:   "gdrsync",
	Short: "Google Drive Rsync Clone",
	Long:  `A CLI tool to synchronize local directories with Google Drive.`,
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
		ctx := context.Background()

		// Initialize application config
		appConfig, err := config.NewAppConfig(dataDir, devMode)
		if err != nil {
			return fmt.Errorf("failed to initialize config: %w", err)
		}

		if err := appConfig.EnsureDataDir(); err != nil {
			return fmt.Errorf("failed to ensure data directory: %w", err)
		}

		application.Config = appConfig

		// Resolve credentials path
		creds := credentialsPath
		if creds == "" {
			creds = appConfig.CredentialsPath
		}

		if _, err := os.Stat(creds); os.IsNotExist(err) {
			return fmt.Errorf("credentials file '%s' does not exist", creds)
		}

		secrets, err := os.ReadFile(creds)
		if err != nil {
			return fmt.Errorf("unable to read client secret file: %w", err)
		}

		oauthConfig, err := google.ConfigFromJSON(secrets, drive.DriveScope)
		if err != nil {
			return fmt.Errorf("unable to parse client secret file: %w", err)
		}

		client := googleclient.GetClient(oauthConfig, &googleclient.AuthConfig{
			Path: appConfig.DataDir,
		})

		application.DriveService, err = drive.NewService(ctx, option.WithHTTPClient(client))
		if err != nil {
			return fmt.Errorf("failed to create Drive service: %w", err)
		}

		fmt.Println("Authenticated successfully")

		return nil
	},
}

func init() {
	rootCmd.PersistentFlags().StringVarP(&credentialsPath, "credentials", "c", "", "path to google credentials.json (default: <data-dir>/credentials.json)")
	rootCmd.PersistentFlags().StringVar(&dataDir, "data-dir", "", "path to app data directory (default: ~/.gdrsync/)")
	rootCmd.PersistentFlags().BoolVar(&devMode, "dev", false, "use current directory for app data (development mode)")

	rootCmd.AddCommand(application.InitCommand())
	rootCmd.AddCommand(application.SyncCommand())
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
