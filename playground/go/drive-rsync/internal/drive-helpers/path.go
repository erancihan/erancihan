package drivehelpers

import (
	"fmt"
	"path/filepath"
	"strings"

	"google.golang.org/api/drive/v3"
)

// GetOrCreatePath mimics 'mkdir -p'.
// It takes a path string (e.g., "Backups/Work/2024") and ensures it exists on Drive.
// Returns the ID of the final folder.
func GetOrCreatePath(srv *drive.Service, path string) (string, error) {
	// Normalize path separators to forward slashes
	cleanPath := filepath.ToSlash(filepath.Clean(path))

	// Split into segments (e.g., ["Backups", "Work", "2024"])
	segments := strings.Split(cleanPath, "/")

	currentParentID := "root" // Start at My Drive root

	for _, name := range segments {
		// Ignore empty segments caused by double slashes or trailing slashes
		if name == "" || name == "." {
			continue
		}

		// 1. Search for this folder in the current parent
		foundID, err := findFolderID(srv, name, currentParentID)
		if err != nil {
			return "", fmt.Errorf("error finding folder '%s': %v", name, err)
		}

		// 2. If found, traverse into it
		if foundID != "" {
			currentParentID = foundID
			continue
		}

		// 3. If not found, create it
		newID, err := createFolder(srv, name, currentParentID)
		if err != nil {
			return "", fmt.Errorf("error creating folder '%s': %v", name, err)
		}

		fmt.Printf("Created remote folder: %s (ID: %s)\n", name, newID)
		currentParentID = newID
	}

	return currentParentID, nil
}

// findFolderID looks for a specific folder name inside a parent ID
func findFolderID(srv *drive.Service, name, parentID string) (string, error) {
	q := fmt.Sprintf("name = '%s' and '%s' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false", name, parentID)

	// We only need the ID
	r, err := srv.Files.List().Q(q).Fields("files(id)").Do()
	if err != nil {
		return "", err
	}

	if len(r.Files) > 0 {
		// Return the first match.
		// Note: Drive allows duplicate names; we just grab the first one we see.
		return r.Files[0].Id, nil
	}

	return "", nil // Not found
}

// createFolder creates a single folder inside a parent ID
func createFolder(srv *drive.Service, name, parentID string) (string, error) {
	f := &drive.File{
		Name:     name,
		MimeType: "application/vnd.google-apps.folder",
		Parents:  []string{parentID},
	}

	res, err := srv.Files.Create(f).Fields("id").Do()
	if err != nil {
		return "", err
	}
	return res.Id, nil
}
