package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDefaultDataDir(t *testing.T) {
	dir, err := DefaultDataDir()
	if err != nil {
		t.Fatalf("DefaultDataDir() error: %v", err)
	}

	home, _ := os.UserHomeDir()
	expected := filepath.Join(home, AppDirName)
	if dir != expected {
		t.Errorf("DefaultDataDir() = %q, want %q", dir, expected)
	}
}

func TestNewAppConfig_DevMode(t *testing.T) {
	cfg, err := NewAppConfig("", true)
	if err != nil {
		t.Fatalf("NewAppConfig(\"\", true) error: %v", err)
	}

	cwd, _ := os.Getwd()
	if cfg.DataDir != cwd {
		t.Errorf("DataDir = %q, want %q (cwd)", cfg.DataDir, cwd)
	}
	if !cfg.DevMode {
		t.Error("DevMode should be true")
	}
	if cfg.CredentialsPath != filepath.Join(cwd, "credentials.json") {
		t.Errorf("CredentialsPath = %q, want credentials.json in cwd", cfg.CredentialsPath)
	}
	if cfg.TokenPath != filepath.Join(cwd, "token.json") {
		t.Errorf("TokenPath = %q, want token.json in cwd", cfg.TokenPath)
	}
}

func TestNewAppConfig_CustomDir(t *testing.T) {
	tmpDir := t.TempDir()

	cfg, err := NewAppConfig(tmpDir, false)
	if err != nil {
		t.Fatalf("NewAppConfig(%q, false) error: %v", tmpDir, err)
	}

	if cfg.DataDir != tmpDir {
		t.Errorf("DataDir = %q, want %q", cfg.DataDir, tmpDir)
	}
	if cfg.DevMode {
		t.Error("DevMode should be false")
	}
}

func TestNewAppConfig_Production(t *testing.T) {
	cfg, err := NewAppConfig("", false)
	if err != nil {
		t.Fatalf("NewAppConfig(\"\", false) error: %v", err)
	}

	home, _ := os.UserHomeDir()
	expected := filepath.Join(home, AppDirName)
	if cfg.DataDir != expected {
		t.Errorf("DataDir = %q, want %q", cfg.DataDir, expected)
	}
}

func TestEnsureDataDir(t *testing.T) {
	tmpDir := t.TempDir()
	target := filepath.Join(tmpDir, "subdir", "nested")

	cfg, err := NewAppConfig(target, false)
	if err != nil {
		t.Fatal(err)
	}

	if err := cfg.EnsureDataDir(); err != nil {
		t.Fatalf("EnsureDataDir() error: %v", err)
	}

	info, err := os.Stat(target)
	if err != nil {
		t.Fatalf("directory was not created: %v", err)
	}
	if !info.IsDir() {
		t.Error("expected a directory")
	}
}
