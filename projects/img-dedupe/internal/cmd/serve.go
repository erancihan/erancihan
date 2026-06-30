package cmd

import (
	"github.com/erancihan/img-dedupe/internal/web"
	"github.com/spf13/cobra"
)

func serveCmd() *cobra.Command {
	var addr string
	cmd := &cobra.Command{
		Use:   "serve",
		Short: "Start the web GUI",
		RunE: func(cmd *cobra.Command, args []string) error {
			svc, err := serviceFrom(cmd.Context())
			if err != nil {
				return err
			}
			return web.NewServer(svc, addr).ListenAndServe(cmd.Context())
		},
	}
	cmd.Flags().StringVar(&addr, "addr", "127.0.0.1:8080", "Address to listen on")
	return cmd
}
