package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

func registerFoldersCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "register-folders <path>...",
		Short: "Register one or more folders to scan for images",
		Args:  cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			svc, err := serviceFrom(cmd.Context())
			if err != nil {
				return err
			}
			for _, path := range args {
				folder, err := svc.RegisterFolder(path)
				if err != nil {
					return err
				}
				fmt.Printf("Registered [%d] %s\n", folder.ID, folder.Path)
			}
			return nil
		},
	}
}
