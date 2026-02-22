package config

import (
	"fmt"
	"os"
	"path/filepath"
)

const (
	// AppDirName is the name of the application data directory in the user's home.
	AppDirName = ".gdrsync"

	// SyncFileName is the name of the dotfile placed in synced folders.
	SyncFileName = ".grsync"
)

// AppConfig holds resolved paths and settings for the application.
type AppConfig struct {
	// DataDir is the absolute path to the app data directory.
	DataDir         string
	CredentialsPath string
	TokenPath       string
	DevMode         bool
}

// NewAppConfig creates a new AppConfig with resolved paths.
// If dataDir is empty, it defaults to ~/.gdrsync/.
// If devMode is true and dataDir is empty, it defaults to "./" (the current working directory).
func NewAppConfig(dataDir string, devMode bool) (*AppConfig, error) {
	if dataDir == "" {
		if devMode {
			cwd, err := os.Getwd()
			if err != nil {
				return nil, fmt.Errorf("failed to get current working directory: %w", err)
			}
			dataDir = cwd
		} else {
			dir, err := DefaultDataDir()
			if err != nil {
				return nil, err
			}
			dataDir = dir
		}
	}

	// Resolve to absolute path
	absDir, err := filepath.Abs(dataDir)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve data directory path: %w", err)
	}

	return &AppConfig{
		DataDir:         absDir,
		CredentialsPath: filepath.Join(absDir, "credentials.json"),
		TokenPath:       filepath.Join(absDir, "token.json"),
		DevMode:         devMode,
	}, nil
}

// DefaultDataDir returns the default app data directory (~/.gdrsync/).
func DefaultDataDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to determine home directory: %w", err)
	}
	return filepath.Join(home, AppDirName), nil
}

// EnsureDataDir creates the data directory if it doesn't exist.
func (c *AppConfig) EnsureDataDir() error {
	if err := os.MkdirAll(c.DataDir, 0700); err != nil {
		return fmt.Errorf("failed to create data directory '%s': %w", c.DataDir, err)
	}
	return nil
}
