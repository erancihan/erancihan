package application

import (
	"drive-rsync/internal/config"
	"drive-rsync/internal/database"
	drivehelpers "drive-rsync/internal/drive-helpers"
	"fmt"

	"github.com/spf13/cobra"
)

// Usage: gdrsync init <RemoteFolderName>
func InitCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "init [remote folder name]",
		Short: "Initialize the current directory for sync",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			folderName := args[0]

			id, err := drivehelpers.GetOrCreatePath(DriveService, folderName)
			if err != nil {
				return fmt.Errorf("error creating remote folder: %w", err)
			}

			// Create a new sync database and save it
			dbPath := config.SyncFileName
			db := database.New(dbPath, id, folderName)

			if err := db.Save(); err != nil {
				return fmt.Errorf("error saving sync database: %w", err)
			}

			fmt.Printf("Initialized sync for '%s' (ID: %s)\n", folderName, id)
			return nil
		},
	}
}
