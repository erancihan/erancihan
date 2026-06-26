package cmd

import (
	"context"
	"fmt"

	"github.com/erancihan/img-dedupe/internal/service"
	"github.com/joho/godotenv"
	"github.com/spf13/cobra"
)

// Execute builds the command tree and runs it, returning a process exit code.
func Execute(ctx context.Context) int {
	_ = godotenv.Load() // optional .env, ignored if absent

	root := &cobra.Command{
		Use:           "imgdedupe",
		Short:         "Find and remove duplicate images",
		SilenceUsage:  true,
		SilenceErrors: true,
		// Open the database once and stash the service in the command context so
		// every subcommand shares the same connection.
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			dsn, err := cmd.Flags().GetString("db")
			if err != nil {
				return err
			}
			hardDelete, _ := cmd.Flags().GetBool("hard-delete")
			trashDir, _ := cmd.Flags().GetString("trash-dir")

			svc, err := service.New(dsn)
			if err != nil {
				return err
			}
			svc.HardDelete = hardDelete
			svc.TrashDir = trashDir

			cmd.SetContext(withService(cmd.Context(), svc))
			return nil
		},
		PersistentPostRunE: func(cmd *cobra.Command, args []string) error {
			svc, err := serviceFrom(cmd.Context())
			if err != nil {
				return nil // nothing was opened
			}
			return svc.Close()
		},
		// Default action: list registered folders.
		RunE: func(cmd *cobra.Command, args []string) error {
			svc, err := serviceFrom(cmd.Context())
			if err != nil {
				return err
			}
			folders, err := svc.ListFolders()
			if err != nil {
				return err
			}
			if len(folders) == 0 {
				fmt.Println("No folders registered. Use 'imgdedupe register-folders <path>' to add one.")
				return nil
			}
			fmt.Println("Registered folders:")
			for _, f := range folders {
				fmt.Printf("  [%d] %s\n", f.ID, f.Path)
			}
			return nil
		},
	}

	root.PersistentFlags().String("db", "imgdedupe.db", "Path to the SQLite database file")
	root.PersistentFlags().Bool("hard-delete", false, "Permanently delete files instead of moving them to the trash dir")
	root.PersistentFlags().String("trash-dir", "", "Directory to move removed files into (default ./.imgdedupe-trash)")

	root.AddCommand(
		registerFoldersCmd(),
		scanCmd(),
		dedupeCmd(),
		serveCmd(),
	)

	if err := root.ExecuteContext(ctx); err != nil {
		fmt.Printf("Error: %v\n", err)
		return 1
	}
	return 0
}
