package cmd

import (
	"fmt"

	"github.com/erancihan/img-dedupe/internal/models"
	"github.com/erancihan/img-dedupe/internal/service"
	"github.com/spf13/cobra"
)

func dedupeCmd() *cobra.Command {
	var (
		apply     bool
		policy    string
		similar   bool
		threshold int
	)
	cmd := &cobra.Command{
		Use:   "dedupe",
		Short: "Find duplicate (or visually similar) images and optionally remove the extras",
		RunE: func(cmd *cobra.Command, args []string) error {
			svc, err := serviceFrom(cmd.Context())
			if err != nil {
				return err
			}

			noun := "duplicate"
			if similar {
				noun = "similar"
			}

			// Gather groups (exact or perceptual) as parallel label/image slices.
			var labels []string
			var imageGroups [][]models.Image
			if similar {
				groups, err := svc.FindSimilar(threshold)
				if err != nil {
					return err
				}
				for _, g := range groups {
					labels = append(labels, g.Key)
					imageGroups = append(imageGroups, g.Images)
				}
			} else {
				groups, err := svc.FindDuplicates()
				if err != nil {
					return err
				}
				for _, g := range groups {
					labels = append(labels, shortHash(g.Hash))
					imageGroups = append(imageGroups, g.Images)
				}
			}

			if len(imageGroups) == 0 {
				fmt.Printf("No %s images found.\n", noun)
				return nil
			}

			redundant := 0
			for i, imgs := range imageGroups {
				fmt.Printf("\n%s (%d copies)\n", labels[i], len(imgs))
				for _, img := range imgs {
					fmt.Printf("  [%d] %s (%d bytes, %dx%d)\n", img.ID, img.Path, img.Size, img.Width, img.Height)
				}
				redundant += len(imgs) - 1
			}
			fmt.Printf("\n%d %s group(s), %d redundant file(s).\n", len(imageGroups), noun, redundant)

			var res *service.DeleteResult
			if similar {
				res, err = svc.ResolveSimilar(threshold, service.KeepPolicy(policy), !apply)
			} else {
				res, err = svc.ResolveDuplicates(service.KeepPolicy(policy), !apply)
			}
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
	cmd.Flags().BoolVar(&similar, "similar", false, "Match visually similar images (perceptual hash), not just exact duplicates")
	cmd.Flags().IntVar(&threshold, "threshold", service.DefaultSimilarityThreshold, "Max perceptual-hash distance for --similar (0-64; lower is stricter)")
	return cmd
}

func shortHash(h string) string {
	if len(h) > 12 {
		return h[:12]
	}
	return h
}
