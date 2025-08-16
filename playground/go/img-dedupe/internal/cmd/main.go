package cmd

import (
	"context"
	"fmt"

	"github.com/erancihan/img-dedupe/internal/models"
	"github.com/joho/godotenv"
	"github.com/spf13/cobra"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

const APP_CONTEXT_KEY = "appContext"

type AppContext struct {
	DB *gorm.DB
}

func Execute(ctx context.Context) int {
	_ = godotenv.Load() // Load environment variables from .env file

	var db *gorm.DB

	imgdedupCmd := &cobra.Command{
		Use: "imgdedupe",
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			fmt.Println("Initializing img-dedupe...")

			// Load environment variables if needed
			_ = godotenv.Load()

			// get db path from flags
			dbPath, err := cmd.Flags().GetString("db")
			if err != nil {
				return err
			}

			fmt.Printf("Using database at: %s\n", dbPath)

			db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
				DisableForeignKeyConstraintWhenMigrating: true,
			})
			if err != nil {
				return fmt.Errorf("failed to connect to database: %w", err)
			}

			db.AutoMigrate(&models.Image{}, &models.Folder{})

			cmd.SetContext(context.WithValue(ctx, APP_CONTEXT_KEY, &AppContext{DB: db}))

			return nil
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			if db == nil {
				return fmt.Errorf("database connection is not initialized")
			}

			// list all folders
			var folders []models.Folder
			if err := db.Find(&folders).Error; err != nil {
				return fmt.Errorf("failed to retrieve folders: %w", err)
			}
			fmt.Println("Folders in the database:")
			for _, folder := range folders {
				fmt.Printf("- %s (ID: %d)\n", folder.Path, folder.ID)
			}

			return nil
		},
		PersistentPostRunE: func(cmd *cobra.Command, args []string) error {
			if ctxVal := cmd.Context().Value(APP_CONTEXT_KEY); ctxVal != nil {
				if appCtx, ok := ctxVal.(*AppContext); ok && appCtx.DB != nil {
					fmt.Println("Closing database connection...")

					// return appCtx.DB.
				}
			}

			return nil
		},
	}

	// get sqlite database connection path from args
	imgdedupCmd.PersistentFlags().String("db", "file:imgdedupe.db?cache=shared&mode=rwc", "Path to the SQLite database file")

	imgdedupCmd.AddCommand(RegisterFolders(ctx))

	if err := imgdedupCmd.ExecuteContext(ctx); err != nil {
		fmt.Printf("Error executing command: %v\n", err)
		return 1
	}

	return 0
}
