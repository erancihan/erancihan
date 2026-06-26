package service

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"image"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"

	// Register decoders so image.DecodeConfig can read common formats.
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"

	_ "golang.org/x/image/bmp"
	_ "golang.org/x/image/tiff"
	_ "golang.org/x/image/webp"

	"github.com/erancihan/img-dedupe/internal/models"
	"gorm.io/gorm"
)

// imageExts is the set of file extensions treated as images during a scan.
var imageExts = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".gif":  true,
	".bmp":  true,
	".webp": true,
	".tif":  true,
	".tiff": true,
}

// ScanResult summarizes a scan run.
type ScanResult struct {
	FoldersScanned int      `json:"folders_scanned"`
	ImagesFound    int      `json:"images_found"`
	ImagesAdded    int      `json:"images_added"`
	ImagesUpdated  int      `json:"images_updated"`
	Errors         []string `json:"errors,omitempty"`
}

// ScanFolders walks every registered folder (or just folderID when non-zero),
// indexing every image file it finds. Per-file errors are collected rather than
// aborting the whole scan.
func (s *Service) ScanFolders(folderID uint) (*ScanResult, error) {
	var folders []models.Folder
	q := s.DB.Model(&models.Folder{})
	if folderID != 0 {
		q = q.Where("id = ?", folderID)
	}
	if err := q.Find(&folders).Error; err != nil {
		return nil, fmt.Errorf("failed to load folders: %w", err)
	}

	result := &ScanResult{}
	for _, folder := range folders {
		result.FoldersScanned++

		walkErr := filepath.WalkDir(folder.Path, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", path, err))
				return nil
			}
			if d.IsDir() || !imageExts[strings.ToLower(filepath.Ext(path))] {
				return nil
			}
			result.ImagesFound++

			added, err := s.indexImage(folder.ID, path)
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", path, err))
				return nil
			}
			if added {
				result.ImagesAdded++
			} else {
				result.ImagesUpdated++
			}
			return nil
		})
		if walkErr != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", folder.Path, walkErr))
		}
	}
	return result, nil
}

// indexImage hashes a single file and upserts its Image row, returning whether a
// new row was created (true) or an existing one updated (false).
func (s *Service) indexImage(folderID uint, path string) (added bool, err error) {
	info, err := os.Stat(path)
	if err != nil {
		return false, err
	}

	hash, err := hashFile(path)
	if err != nil {
		return false, err
	}
	width, height := imageDimensions(path)

	var existing models.Image
	err = s.DB.Where("path = ?", path).First(&existing).Error
	switch {
	case err == nil:
		existing.Hash = hash
		existing.Size = info.Size()
		existing.Width = width
		existing.Height = height
		existing.ModTime = info.ModTime()
		existing.FolderID = folderID
		if err := s.DB.Save(&existing).Error; err != nil {
			return false, err
		}
		return false, nil
	case errors.Is(err, gorm.ErrRecordNotFound):
		img := models.Image{
			Path:     path,
			Hash:     hash,
			Size:     info.Size(),
			Width:    width,
			Height:   height,
			ModTime:  info.ModTime(),
			FolderID: folderID,
		}
		if err := s.DB.Create(&img).Error; err != nil {
			return false, err
		}
		return true, nil
	default:
		return false, err
	}
}

// hashFile returns the hex-encoded SHA-256 of a file's contents, streaming it so
// large files don't have to be held in memory.
func hashFile(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// imageDimensions reads just the image header to get its dimensions. It is
// best-effort: unreadable or unsupported formats return (0, 0).
func imageDimensions(path string) (width, height int) {
	f, err := os.Open(path)
	if err != nil {
		return 0, 0
	}
	defer f.Close()

	cfg, _, err := image.DecodeConfig(f)
	if err != nil {
		return 0, 0
	}
	return cfg.Width, cfg.Height
}
