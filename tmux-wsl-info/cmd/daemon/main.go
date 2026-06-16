package main

import (
	"bufio"
	"bytes"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

func main() {
	interval := flag.Int("interval", 1, "Update interval in seconds")
	outFile := flag.String("out", "/tmp/tmux-wsl-info", "Output file path")
	pidFile := flag.String("pid", "/tmp/tmux-wsl-info-daemon.pid", "PID file path")
	flag.Parse()

	// Locate wsl-info.exe next to this binary
	self, err := os.Executable()
	if err != nil {
		fmt.Fprintln(os.Stderr, "error: cannot determine executable path:", err)
		os.Exit(1)
	}
	exe := filepath.Join(filepath.Dir(self), "wsl-info.exe")

	// Write PID file
	os.WriteFile(*pidFile, []byte(fmt.Sprintf("%d", os.Getpid())), 0644)
	defer os.Remove(*pidFile)

	// Graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)

	// Start wsl-info.exe as a persistent subprocess
	cmd := exec.Command(exe, "-interval", fmt.Sprintf("%d", *interval))

	// Capture stderr for diagnostics
	var stderrBuf bytes.Buffer
	cmd.Stderr = &stderrBuf

	// Create stdin pipe to allow wsl-info.exe to detect parent exit
	stdinPipe, err := cmd.StdinPipe()
	if err != nil {
		msg := fmt.Sprintf("error: failed to create stdin pipe: %v", err)
		os.WriteFile(*outFile, []byte(msg), 0644)
		fmt.Fprintln(os.Stderr, msg)
		os.Exit(1)
	}
	defer stdinPipe.Close()

	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		msg := fmt.Sprintf("error: failed to create stdout pipe: %v", err)
		os.WriteFile(*outFile, []byte(msg), 0644)
		fmt.Fprintln(os.Stderr, msg)
		os.Exit(1)
	}

	if err := cmd.Start(); err != nil {
		msg := fmt.Sprintf("error: failed to start wsl-info.exe: %v", err)
		os.WriteFile(*outFile, []byte(msg), 0644)
		fmt.Fprintln(os.Stderr, msg)
		os.Exit(1)
	}

	// Channel to monitor subprocess exit
	doneCh := make(chan error, 1)
	go func() {
		doneCh <- cmd.Wait()
	}()

	// Scanner to read updates from stdout
	scanner := bufio.NewScanner(stdoutPipe)
	go func() {
		for scanner.Scan() {
			content := scanner.Text()
			if content == "" {
				continue
			}
			// Atomic write
			tmp := *outFile + ".tmp"
			if err := os.WriteFile(tmp, []byte(content), 0644); err != nil {
				continue
			}
			os.Rename(tmp, *outFile)
		}
	}()

	select {
	case <-sigCh:
		// Gracefully close stdin of subprocess, which triggers wsl-info.exe to exit
		stdinPipe.Close()

		// Wait with a timeout, kill if it hangs
		select {
		case <-doneCh:
		case <-time.After(2 * time.Second):
			cmd.Process.Kill()
		}
		os.Remove(*outFile)
	case err := <-doneCh:
		stderrStr := strings.TrimSpace(stderrBuf.String())
		var msg string
		if stderrStr != "" {
			msg = fmt.Sprintf("error: wsl-info.exe failed: %s", stderrStr)
		} else {
			msg = fmt.Sprintf("error: wsl-info.exe exited: %v", err)
		}
		os.WriteFile(*outFile, []byte(msg), 0644)
		fmt.Fprintln(os.Stderr, msg)
		os.Exit(1)
	}
}
