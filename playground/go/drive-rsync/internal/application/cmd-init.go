package application

import (
	drivehelpers "drive-rsync/internal/drive-helpers"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/spf13/cobra"
)

// Usage: gdrsync init <RemoteFolderName>
func InitCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "init [remote folder name]",
		Short: "Initialize the current directory for sync",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			folderName := args[0]

			id, err := drivehelpers.GetOrCreatePath(DriveService, folderName)
			if err != nil {
				fmt.Printf("Error creating folder: %v\n", err)
				return
			}

			// 2. Write the config file
			config := SyncConfig{
				RemoteFolderID: id,
				RemotePathName: folderName,
				LastSync:       time.Now(),
			}

			file, _ := json.MarshalIndent(config, "", " ")
			_ = os.WriteFile(ConfigFileName, file, 0644)

			fmt.Printf("Initialized sync for '%s' (ID: %s)\n", folderName, id)
		},
	}
}
