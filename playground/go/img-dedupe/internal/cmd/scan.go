package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

func scanCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "scan",
		Short: "Scan registered folders and index image files",
		RunE: func(cmd *cobra.Command, args []string) error {
			svc, err := serviceFrom(cmd.Context())
			if err != nil {
				return err
			}
			result, err := svc.ScanFolders(0)
			if err != nil {
				return err
			}
			fmt.Printf("Scanned %d folder(s): %d image(s) found, %d added, %d updated.\n",
				result.FoldersScanned, result.ImagesFound, result.ImagesAdded, result.ImagesUpdated)
			for _, e := range result.Errors {
				fmt.Printf("  ! %s\n", e)
			}
			return nil
		},
	}
}
