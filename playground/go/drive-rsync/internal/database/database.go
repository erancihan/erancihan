package database

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// FileEntry represents a tracked file or directory in the sync database.
type FileEntry struct {
	RemoteID       string    `json:"remote_id"`
	LocalHash      string    `json:"local_hash,omitempty"`
	RemoteHash     string    `json:"remote_hash,omitempty"`
	LocalModified  time.Time `json:"local_modified"`
	RemoteModified time.Time `json:"remote_modified"`
	Size           int64     `json:"size"`
	IsDir          bool      `json:"is_dir"`
}

// SyncDatabase is the in-memory representation of the .grsync dotfile.
// It acts as a local database for tracking sync state.
type SyncDatabase struct {
	RemoteFolderID string               `json:"remote_folder_id"`
	RemotePathName string               `json:"remote_path_name"`
	LastSync       time.Time            `json:"last_sync"`
	Files          map[string]FileEntry `json:"files"`

	// path is the filesystem path where this database is persisted.
	path string `json:"-"`
}

// Load reads and parses a .grsync file from the given path.
// Returns an error if the file cannot be read or parsed.
func Load(path string) (*SyncDatabase, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read sync database '%s': %w", path, err)
	}

	db := &SyncDatabase{}
	if err := json.Unmarshal(data, db); err != nil {
		return nil, fmt.Errorf("failed to parse sync database '%s': %w", path, err)
	}

	db.path = path

	// Ensure the Files map is initialized
	if db.Files == nil {
		db.Files = make(map[string]FileEntry)
	}

	return db, nil
}

// New creates a new SyncDatabase with the given remote folder info.
func New(path, remoteFolderID, remotePathName string) *SyncDatabase {
	return &SyncDatabase{
		RemoteFolderID: remoteFolderID,
		RemotePathName: remotePathName,
		LastSync:       time.Now(),
		Files:          make(map[string]FileEntry),
		path:           path,
	}
}

// Save writes the database to disk atomically.
// It writes to a temporary file first, then renames to avoid partial writes.
func (db *SyncDatabase) Save() error {
	if db.path == "" {
		return fmt.Errorf("database path not set")
	}

	data, err := json.MarshalIndent(db, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal sync database: %w", err)
	}

	// Write to a temp file in the same directory, then rename for atomicity.
	dir := filepath.Dir(db.path)
	tmp, err := os.CreateTemp(dir, ".grsync.tmp.*")
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	tmpName := tmp.Name()

	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		os.Remove(tmpName)
		return fmt.Errorf("failed to write temp file: %w", err)
	}

	if err := tmp.Close(); err != nil {
		os.Remove(tmpName)
		return fmt.Errorf("failed to close temp file: %w", err)
	}

	if err := os.Rename(tmpName, db.path); err != nil {
		os.Remove(tmpName)
		return fmt.Errorf("failed to rename temp file to '%s': %w", db.path, err)
	}

	return nil
}

// SetPath sets the filesystem path for this database.
func (db *SyncDatabase) SetPath(path string) {
	db.path = path
}

// Path returns the filesystem path for this database.
func (db *SyncDatabase) Path() string {
	return db.path
}

// TrackFile adds or updates a file entry in the database.
func (db *SyncDatabase) TrackFile(relPath string, entry FileEntry) {
	db.Files[relPath] = entry
}

// RemoveFile removes a file entry from the database.
func (db *SyncDatabase) RemoveFile(relPath string) {
	delete(db.Files, relPath)
}

// GetFile looks up a file entry by its relative path.
// Returns the entry and true if found, or a zero-value entry and false if not.
func (db *SyncDatabase) GetFile(relPath string) (FileEntry, bool) {
	entry, ok := db.Files[relPath]
	return entry, ok
}

// UpdateLastSync sets the LastSync timestamp to now.
func (db *SyncDatabase) UpdateLastSync() {
	db.LastSync = time.Now()
}
