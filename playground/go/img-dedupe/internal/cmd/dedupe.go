package cmd

import (
	"fmt"

	"github.com/erancihan/img-dedupe/internal/service"
	"github.com/spf13/cobra"
)

func dedupeCmd() *cobra.Command {
	var (
		apply  bool
		policy string
	)
	cmd := &cobra.Command{
		Use:   "dedupe",
		Short: "Find duplicate images and optionally remove the extras",
		RunE: func(cmd *cobra.Command, args []string) error {
			svc, err := serviceFrom(cmd.Context())
			if err != nil {
				return err
			}

			groups, err := svc.FindDuplicates()
			if err != nil {
				return err
			}
			if len(groups) == 0 {
				fmt.Println("No duplicates found.")
				return nil
			}

			redundant := 0
			for _, g := range groups {
				fmt.Printf("\n%s (%d copies)\n", shortHash(g.Hash), len(g.Images))
				for _, img := range g.Images {
					fmt.Printf("  [%d] %s (%d bytes, %dx%d)\n", img.ID, img.Path, img.Size, img.Width, img.Height)
				}
				redundant += len(g.Images) - 1
			}
			fmt.Printf("\n%d duplicate group(s), %d redundant file(s).\n", len(groups), redundant)

			res, err := svc.ResolveDuplicates(service.KeepPolicy(policy), !apply)
			if err != nil {
				return err
			}
			if !apply {
				fmt.Printf("Dry run (keep: %s). Would remove %d file(s). Re-run with --apply to remove.\n",
					policy, len(res.Planned))
				return nil
			}
			fmt.Printf("Removed %d file(s) (keep: %s).", len(res.Planned), policy)
			if res.Quarantine != "" {
				fmt.Printf(" Moved to %s.", res.Quarantine)
			}
			fmt.Println()
			return nil
		},
	}
	cmd.Flags().BoolVar(&apply, "apply", false, "Actually remove duplicates (default is a dry run)")
	cmd.Flags().StringVar(&policy, "keep", "newest", "Which copy to keep: newest|oldest|largest|first")
	return cmd
}

func shortHash(h string) string {
	if len(h) > 12 {
		return h[:12]
	}
	return h
}
