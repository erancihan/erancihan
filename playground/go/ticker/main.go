package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"time"
)

type TickerFunctionEntry struct {
	fn          func(time.Time)
	lastInvoked time.Time
	interval    time.Duration
	lock        chan struct{}
}

/**
TODO: reentrant lock function calls
TODO: dynamic add/remove functions to ticker
	- serve on HTTP endpoints to add/remove functions
	- use mutex to protect the functions map
*/

func main() {
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt)

	fmt.Println("Press Ctrl+C to stop the ticker...")

	// map of functions to be executed on a tick.
	// this can be on every tick or one second from previous invocation...
	// this map stores functions and their last execution time.
	// on each tick, we check if enough time has passed to execute the function again.

	functions := map[string]*TickerFunctionEntry{
		"func1": {
			fn: func(dt time.Time) {
				fmt.Println("Function 1 executed at", dt)
			},
			lastInvoked: time.Time{},
			interval:    1 * time.Second,
		},
		"func2": {
			fn: func(dt time.Time) {
				fmt.Println("Function 2 executed at", dt)
			},
			lastInvoked: time.Time{},
			interval:    2 * time.Second,
		},
	}

	for {
		select {
		case t := <-ticker.C:
			for _, entry := range functions {
				if t.Sub(entry.lastInvoked) >= entry.interval {
					// Execute the function in a separate goroutine to avoid blocking
					go func(entry *TickerFunctionEntry) {
						defer func() {
							if r := recover(); r != nil {
								fmt.Println("Recovered from panic in ticker function:", r)
							}
						}()

						// TODO: acquire reentrant lock
						entry.fn(t)

						entry.lastInvoked = t
						// TODO: release lock
					}(entry)
				}
			}

		case <-ctx.Done():
			fmt.Println("Context cancelled, stopping ticker.")
			return

		case <-sigChan:
			fmt.Println("Received interrupt signal, stopping ticker.")
			cancel()
			return
		}
	}
}
