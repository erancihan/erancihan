package main

import (
	"context"
	"os"
	"os/signal"

	"github.com/erancihan/img-dedupe/internal/cmd"
)

// version is set at build time via -ldflags "-X main.version=...".
var version = "dev"

func main() {
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, os.Kill)
	defer cancel()

	ret := cmd.Execute(ctx, version)
	os.Exit(ret)
}
