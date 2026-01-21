package application

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"
	"google.golang.org/api/drive/v3"
)

// Cache to store "Directory Path -> Drive Folder ID" to avoid repeated API calls
var folderCache = make(map[string]string)

func SyncCommand() *cobra.Command {
	return &cobra.Command{
		Use:   "sync",
		Short: "Push local changes to Google Drive",
		Run: func(cmd *cobra.Command, args []string) {
			// 1. Load Config
			data, err := os.ReadFile(ConfigFileName)
			if err != nil {
				fmt.Println("Not initialized. Run 'gdrsync init <name>' first.")
				return
			}
			var config SyncConfig
			json.Unmarshal(data, &config)

			fmt.Printf("Syncing to remote folder: %s (%s)\n", config.RemotePathName, config.RemoteFolderID)

			// 2. Perform Sync
			err = performSync(DriveService, config.RemoteFolderID)
			if err != nil {
				fmt.Printf("Sync failed: %v\n", err)
			} else {
				fmt.Println("Sync completed successfully.")
				// Update timestamp
				config.LastSync = time.Now()
				updatedConfig, _ := json.MarshalIndent(config, "", " ")
				os.WriteFile(ConfigFileName, updatedConfig, 0644)
			}
		},
	}
}

func performSync(srv *drive.Service, rootRemoteID string) error {
	// Walk the current directory
	return filepath.Walk(".", func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip hidden files and the config file itself
		if strings.HasPrefix(info.Name(), ".") || info.Name() == ConfigFileName {
			if info.IsDir() && info.Name() != "." {
				return filepath.SkipDir
			}
			return nil
		}

		relPath, _ := filepath.Rel(".", path)
		if relPath == "." {
			return nil
		}

		// Determine the parent folder ID for this item
		parentDir := filepath.Dir(relPath)
		parentID := rootRemoteID

		if parentDir != "." {
			// We need to resolve the ID of the parent folder on Drive
			var ok bool
			parentID, ok = folderCache[parentDir]
			if !ok {
				return fmt.Errorf("could not resolve parent ID for %s", parentDir)
			}
		}

		if info.IsDir() {
			// Handle Directory Creation
			return ensureRemoteFolder(srv, relPath, info.Name(), parentID)
		} else {
			// Handle File Upload/Sync
			return syncFile(srv, path, info.Name(), parentID)
		}
	})
}

// ensureRemoteFolder checks if a folder exists remotely, creates it if not, and caches the ID
func ensureRemoteFolder(srv *drive.Service, relPath, name, parentID string) error {
	// 1. Check if folder exists in parentID
	q := fmt.Sprintf("name = '%s' and '%s' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false", name, parentID)
	r, err := srv.Files.List().Q(q).Fields("files(id)").Do()
	if err != nil {
		return err
	}

	var folderID string
	if len(r.Files) > 0 {
		folderID = r.Files[0].Id
	} else {
		// Create it
		f := &drive.File{
			Name:     name,
			Parents:  []string{parentID},
			MimeType: "application/vnd.google-apps.folder",
		}
		res, err := srv.Files.Create(f).Fields("id").Do()
		if err != nil {
			return err
		}
		folderID = res.Id
		fmt.Printf("[Created Dir] %s\n", relPath)
	}

	// Add to cache so children can find it
	folderCache[relPath] = folderID
	return nil
}

func syncFile(srv *drive.Service, localPath, name, parentID string) error {
	// 1. Calculate Local Hash
	localHash, err := hashFile(localPath)
	if err != nil {
		return err
	}

	// 2. Check for file in Remote
	q := fmt.Sprintf("name = '%s' and '%s' in parents and trashed = false", name, parentID)
	r, err := srv.Files.List().Q(q).Fields("files(id, md5Checksum)").Do()
	if err != nil {
		return err
	}

	// 3. Compare and Action
	if len(r.Files) > 0 {
		remoteFile := r.Files[0]
		if remoteFile.Md5Checksum == localHash {
			// fmt.Printf("[Skipping] %s (No Change)\n", name)
			return nil
		}
		// File exists but hash differs: UPDATE
		fmt.Printf("[Updating] %s\n", name)

		f, err := os.Open(localPath)
		if err != nil {
			return err
		}
		defer f.Close()

		// Update uses Files.Update
		_, err = srv.Files.Update(remoteFile.Id, nil).Media(f).Do()
		return err
	}

	// File does not exist: UPLOAD
	fmt.Printf("[Uploading] %s\n", name)
	f, err := os.Open(localPath)
	if err != nil {
		return err
	}
	defer f.Close()

	driveFile := &drive.File{
		Name:    name,
		Parents: []string{parentID},
	}
	_, err = srv.Files.Create(driveFile).Media(f).Do()
	return err
}

// hashFile returns the MD5 string required by Google Drive
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
