package database

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestNewAndSaveLoad(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, ".grsync")

	// Create and save
	db := New(dbPath, "folder-id-123", "my/remote/path")

	db.TrackFile("file.txt", FileEntry{
		RemoteID:  "remote-id-1",
		LocalHash: "abc123",
		Size:      1024,
	})

	if err := db.Save(); err != nil {
		t.Fatalf("Save() error: %v", err)
	}

	// Load and verify
	loaded, err := Load(dbPath)
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}

	if loaded.RemoteFolderID != "folder-id-123" {
		t.Errorf("RemoteFolderID = %q, want %q", loaded.RemoteFolderID, "folder-id-123")
	}
	if loaded.RemotePathName != "my/remote/path" {
		t.Errorf("RemotePathName = %q, want %q", loaded.RemotePathName, "my/remote/path")
	}

	entry, ok := loaded.GetFile("file.txt")
	if !ok {
		t.Fatal("expected file.txt to be tracked")
	}
	if entry.RemoteID != "remote-id-1" {
		t.Errorf("RemoteID = %q, want %q", entry.RemoteID, "remote-id-1")
	}
	if entry.LocalHash != "abc123" {
		t.Errorf("LocalHash = %q, want %q", entry.LocalHash, "abc123")
	}
	if entry.Size != 1024 {
		t.Errorf("Size = %d, want %d", entry.Size, 1024)
	}
}

func TestTrackAndRemoveFile(t *testing.T) {
	db := New("", "id", "path")

	db.TrackFile("a/b/c.txt", FileEntry{RemoteID: "r1"})
	db.TrackFile("x/y.txt", FileEntry{RemoteID: "r2"})

	if len(db.Files) != 2 {
		t.Fatalf("expected 2 files, got %d", len(db.Files))
	}

	db.RemoveFile("a/b/c.txt")

	if len(db.Files) != 1 {
		t.Fatalf("expected 1 file after removal, got %d", len(db.Files))
	}

	_, ok := db.GetFile("a/b/c.txt")
	if ok {
		t.Error("expected a/b/c.txt to be removed")
	}

	entry, ok := db.GetFile("x/y.txt")
	if !ok {
		t.Fatal("expected x/y.txt to still exist")
	}
	if entry.RemoteID != "r2" {
		t.Errorf("RemoteID = %q, want %q", entry.RemoteID, "r2")
	}
}

func TestUpdateLastSync(t *testing.T) {
	db := New("", "id", "path")

	before := db.LastSync
	time.Sleep(10 * time.Millisecond)
	db.UpdateLastSync()

	if !db.LastSync.After(before) {
		t.Error("LastSync should have been updated to a later time")
	}
}

func TestLoadMissingFile(t *testing.T) {
	_, err := Load("/nonexistent/path/.grsync")
	if err == nil {
		t.Fatal("expected error loading nonexistent file")
	}
}

func TestLoadCorruptFile(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, ".grsync")

	if err := os.WriteFile(dbPath, []byte("not json!"), 0644); err != nil {
		t.Fatal(err)
	}

	_, err := Load(dbPath)
	if err == nil {
		t.Fatal("expected error loading corrupt file")
	}
}

func TestAtomicSave(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, ".grsync")

	db := New(dbPath, "id", "path")
	db.TrackFile("f1.txt", FileEntry{RemoteID: "r1"})

	if err := db.Save(); err != nil {
		t.Fatal(err)
	}

	// Verify no temp files remain
	entries, err := os.ReadDir(tmpDir)
	if err != nil {
		t.Fatal(err)
	}

	for _, e := range entries {
		if e.Name() != ".grsync" {
			t.Errorf("unexpected file remaining after save: %s", e.Name())
		}
	}
}

func TestSaveNoPath(t *testing.T) {
	db := New("", "id", "path")
	if err := db.Save(); err == nil {
		t.Fatal("expected error when saving with empty path")
	}
}

func TestLoadInitializesFilesMap(t *testing.T) {
	tmpDir := t.TempDir()
	dbPath := filepath.Join(tmpDir, ".grsync")

	// Write JSON without "files" key
	data := `{"remote_folder_id":"id","remote_path_name":"p","last_sync":"2026-01-01T00:00:00Z"}`
	if err := os.WriteFile(dbPath, []byte(data), 0644); err != nil {
		t.Fatal(err)
	}

	db, err := Load(dbPath)
	if err != nil {
		t.Fatal(err)
	}

	if db.Files == nil {
		t.Fatal("Files map should be initialized, not nil")
	}

	// Should be safe to use without panic
	db.TrackFile("test.txt", FileEntry{RemoteID: "x"})
}

func TestTrackFileOverwrite(t *testing.T) {
	db := New("", "id", "path")

	db.TrackFile("f.txt", FileEntry{RemoteID: "old", LocalHash: "hash1"})
	db.TrackFile("f.txt", FileEntry{RemoteID: "new", LocalHash: "hash2"})

	entry, ok := db.GetFile("f.txt")
	if !ok {
		t.Fatal("expected f.txt to exist")
	}
	if entry.RemoteID != "new" {
		t.Errorf("RemoteID = %q, want %q", entry.RemoteID, "new")
	}
	if entry.LocalHash != "hash2" {
		t.Errorf("LocalHash = %q, want %q", entry.LocalHash, "hash2")
	}
}

func TestTrackDirectory(t *testing.T) {
	db := New("", "id", "path")

	db.TrackFile("subdir", FileEntry{RemoteID: "dir-id", IsDir: true})

	entry, ok := db.GetFile("subdir")
	if !ok {
		t.Fatal("expected subdir to exist")
	}
	if !entry.IsDir {
		t.Error("expected IsDir to be true")
	}
}
