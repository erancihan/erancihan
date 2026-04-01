package application

import (
	"crypto/md5"
	"drive-rsync/internal/config"
	"drive-rsync/internal/database"
	"drive-rsync/internal/ignore"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"
	"google.golang.org/api/drive/v3"
)

// folderCache stores "relative directory path -> Drive Folder ID" to avoid repeated API calls.
var folderCache = make(map[string]string)

func SyncCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "sync",
		Short: "Push local changes to Google Drive",
		RunE: func(cmd *cobra.Command, args []string) error {
			// 1. Load database
			db, err := database.Load(config.SyncFileName)
			if err != nil {
				return fmt.Errorf("not initialized. Run 'gdrsync init <name>' first: %w", err)
			}

			fmt.Printf("Syncing to remote folder: %s (%s)\n", db.RemotePathName, db.RemoteFolderID)

			// 2. Perform sync
			if err := performSync(DriveService, db); err != nil {
				return fmt.Errorf("sync failed: %w", err)
			}

			// 3. Update timestamp and save
			db.UpdateLastSync()
			if err := db.Save(); err != nil {
				return fmt.Errorf("failed to update sync database: %w", err)
			}

			fmt.Println("Sync completed successfully.")
			return nil
		},
	}
}

func performSync(srv *drive.Service, db *database.SyncDatabase) error {
	rootRemoteID := db.RemoteFolderID

	// Initialize the ignore checker (loads .grsyncignore or uses defaults)
	ignoreChecker, err := ignore.NewChecker(".")
	if err != nil {
		return fmt.Errorf("failed to initialize ignore checker: %w", err)
	}

	return filepath.Walk(".", func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip hidden files/dirs and the sync database file itself
		if strings.HasPrefix(info.Name(), ".") || info.Name() == config.SyncFileName {
			if info.IsDir() && info.Name() != "." {
				return filepath.SkipDir
			}
			return nil
		}

		// Check against ignore rules
		relForIgnore, _ := filepath.Rel(".", path)
		if relForIgnore != "." && ignoreChecker.ShouldIgnore(relForIgnore) {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		relPath, _ := filepath.Rel(".", path)
		if relPath == "." {
			return nil
		}

		// Determine parent folder ID
		parentDir := filepath.Dir(relPath)
		parentID := rootRemoteID

		if parentDir != "." {
			var ok bool
			parentID, ok = folderCache[parentDir]
			if !ok {
				return fmt.Errorf("could not resolve parent ID for %s", parentDir)
			}
		}

		if info.IsDir() {
			return ensureRemoteFolder(srv, db, relPath, info.Name(), parentID)
		}
		return syncFile(srv, db, path, relPath, info.Name(), parentID, info)
	})
}

// ensureRemoteFolder checks if a folder exists remotely, creates it if not,
// caches the ID, and tracks it in the database.
func ensureRemoteFolder(srv *drive.Service, db *database.SyncDatabase, relPath, name, parentID string) error {
	q := fmt.Sprintf(
		"name = '%s' and '%s' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
		name, parentID,
	)
	r, err := srv.Files.List().Q(q).Fields("files(id)").Do()
	if err != nil {
		return fmt.Errorf("failed to list remote folders for '%s': %w", relPath, err)
	}

	var folderID string
	if len(r.Files) > 0 {
		folderID = r.Files[0].Id
	} else {
		f := &drive.File{
			Name:     name,
			Parents:  []string{parentID},
			MimeType: "application/vnd.google-apps.folder",
		}
		res, err := srv.Files.Create(f).Fields("id").Do()
		if err != nil {
			return fmt.Errorf("failed to create remote folder '%s': %w", relPath, err)
		}
		folderID = res.Id
		fmt.Printf("[Created Dir] %s\n", relPath)
	}

	// Cache for child resolution
	folderCache[relPath] = folderID

	// Track in database
	db.TrackFile(relPath, database.FileEntry{
		RemoteID: folderID,
		IsDir:    true,
	})

	return nil
}

// syncFile uploads a new file or updates an existing one, and tracks it in the database.
func syncFile(srv *drive.Service, db *database.SyncDatabase, localPath, relPath, name, parentID string, info os.FileInfo) error {
	// 1. Calculate local hash
	localHash, err := hashFile(localPath)
	if err != nil {
		return fmt.Errorf("failed to hash '%s': %w", relPath, err)
	}

	// 2. Check database first — skip if unchanged
	if entry, ok := db.GetFile(relPath); ok {
		if entry.LocalHash == localHash {
			return nil // No change since last sync
		}
	}

	// 3. Check for file on remote
	q := fmt.Sprintf("name = '%s' and '%s' in parents and trashed = false", name, parentID)
	r, err := srv.Files.List().Q(q).Fields("files(id, md5Checksum, modifiedTime)").Do()
	if err != nil {
		return fmt.Errorf("failed to list remote files for '%s': %w", relPath, err)
	}

	var remoteID string
	var remoteHash string
	var remoteModified time.Time

	if len(r.Files) > 0 {
		remoteFile := r.Files[0]
		if remoteFile.Md5Checksum == localHash {
			// File unchanged on both sides — just track it
			db.TrackFile(relPath, database.FileEntry{
				RemoteID:       remoteFile.Id,
				LocalHash:      localHash,
				RemoteHash:     remoteFile.Md5Checksum,
				LocalModified:  info.ModTime(),
				RemoteModified: parseTime(remoteFile.ModifiedTime),
				Size:           info.Size(),
			})
			return nil
		}

		// File exists but differs: UPDATE
		fmt.Printf("[Updating] %s\n", relPath)

		f, err := os.Open(localPath)
		if err != nil {
			return fmt.Errorf("failed to open '%s' for update: %w", relPath, err)
		}
		defer f.Close()

		updated, err := srv.Files.Update(remoteFile.Id, nil).Media(f).Fields("id, md5Checksum, modifiedTime").Do()
		if err != nil {
			return fmt.Errorf("failed to update '%s': %w", relPath, err)
		}
		remoteID = updated.Id
		remoteHash = updated.Md5Checksum
		remoteModified = parseTime(updated.ModifiedTime)
	} else {
		// File does not exist: UPLOAD
		fmt.Printf("[Uploading] %s\n", relPath)

		f, err := os.Open(localPath)
		if err != nil {
			return fmt.Errorf("failed to open '%s' for upload: %w", relPath, err)
		}
		defer f.Close()

		driveFile := &drive.File{
			Name:    name,
			Parents: []string{parentID},
		}
		created, err := srv.Files.Create(driveFile).Media(f).Fields("id, md5Checksum, modifiedTime").Do()
		if err != nil {
			return fmt.Errorf("failed to upload '%s': %w", relPath, err)
		}
		remoteID = created.Id
		remoteHash = created.Md5Checksum
		remoteModified = parseTime(created.ModifiedTime)
	}

	// Track the file in the database
	db.TrackFile(relPath, database.FileEntry{
		RemoteID:       remoteID,
		LocalHash:      localHash,
		RemoteHash:     remoteHash,
		LocalModified:  info.ModTime(),
		RemoteModified: remoteModified,
		Size:           info.Size(),
	})

	return nil
}

// hashFile returns the MD5 hex string for a file.
func hashFile(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	hash := md5.New()
	if _, err := io.Copy(hash, file); err != nil {
		return "", err
	}
	return hex.EncodeToString(hash.Sum(nil)), nil
}

// parseTime parses an RFC3339 timestamp string, returning zero time on failure.
func parseTime(s string) time.Time {
	t, _ := time.Parse(time.RFC3339, s)
	return t
}
