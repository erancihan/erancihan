package service

import (
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/erancihan/img-dedupe/internal/models"
)

// KeepPolicy decides which image in a duplicate group is kept when resolving.
type KeepPolicy string

const (
	KeepNewest  KeepPolicy = "newest"  // most recently modified
	KeepOldest  KeepPolicy = "oldest"  // least recently modified
	KeepLargest KeepPolicy = "largest" // largest file size
	KeepFirst   KeepPolicy = "first"   // shortest path, then alphabetical
)

// DuplicateGroup is a set of images that share the same content hash.
type DuplicateGroup struct {
	Hash   string         `json:"hash"`
	Images []models.Image `json:"images"`
}

// DeleteResult describes a deletion/quarantine operation (or a dry run of one).
type DeleteResult struct {
	Planned    []models.Image `json:"planned"`
	Quarantine string         `json:"quarantine,omitempty"`
	DryRun     bool           `json:"dry_run"`
}

// FindDuplicates returns groups of images that share a content hash. Only hashes
// with more than one image are returned. Within a group, larger files come first.
func (s *Service) FindDuplicates() ([]DuplicateGroup, error) {
	var hashes []string
	err := s.DB.Model(&models.Image{}).
		Select("hash").
		Group("hash").
		Having("COUNT(*) > 1").
		Order("hash").
		Pluck("hash", &hashes).Error
	if err != nil {
		return nil, fmt.Errorf("failed to find duplicate hashes: %w", err)
	}
	if len(hashes) == 0 {
		return nil, nil
	}

	var images []models.Image
	if err := s.DB.Where("hash IN ?", hashes).
		Order("hash, size DESC, path").
		Find(&images).Error; err != nil {
		return nil, fmt.Errorf("failed to load duplicate images: %w", err)
	}

	byHash := map[string][]models.Image{}
	order := make([]string, 0, len(hashes))
	for _, img := range images {
		if _, ok := byHash[img.Hash]; !ok {
			order = append(order, img.Hash)
		}
		byHash[img.Hash] = append(byHash[img.Hash], img)
	}

	groups := make([]DuplicateGroup, 0, len(order))
	for _, h := range order {
		groups = append(groups, DuplicateGroup{Hash: h, Images: byHash[h]})
	}
	return groups, nil
}

// ResolveDuplicates keeps one image per duplicate group (chosen by policy) and
// removes the rest. With dryRun nothing is changed.
func (s *Service) ResolveDuplicates(policy KeepPolicy, dryRun bool) (*DeleteResult, error) {
	groups, err := s.FindDuplicates()
	if err != nil {
		return nil, err
	}

	var toDelete []uint
	for _, g := range groups {
		keeper := pickKeeper(g.Images, policy)
		for _, img := range g.Images {
			if img.ID != keeper.ID {
				toDelete = append(toDelete, img.ID)
			}
		}
	}
	return s.DeleteImages(toDelete, dryRun)
}

// DeleteImages removes the given image IDs from disk and from the database.
// Files are moved to the trash dir unless HardDelete is set. With dryRun the
// planned set is returned without changing anything.
func (s *Service) DeleteImages(ids []uint, dryRun bool) (*DeleteResult, error) {
	result := &DeleteResult{DryRun: dryRun}
	if len(ids) == 0 {
		return result, nil
	}

	var images []models.Image
	if err := s.DB.Where("id IN ?", ids).Find(&images).Error; err != nil {
		return nil, fmt.Errorf("failed to load images: %w", err)
	}
	result.Planned = images
	if dryRun {
		return result, nil
	}

	for _, img := range images {
		if err := s.removeFile(img); err != nil {
			return result, fmt.Errorf("failed to remove %s: %w", img.Path, err)
		}
		if err := s.DB.Delete(&models.Image{}, img.ID).Error; err != nil {
			return result, fmt.Errorf("failed to delete db row for %s: %w", img.Path, err)
		}
	}
	if !s.HardDelete {
		result.Quarantine = s.trashDir()
	}
	return result, nil
}

// pickKeeper returns the image to retain from a group, per the keep policy.
func pickKeeper(images []models.Image, policy KeepPolicy) models.Image {
	keeper := images[0]
	for _, img := range images[1:] {
		switch policy {
		case KeepNewest:
			if img.ModTime.After(keeper.ModTime) {
				keeper = img
			}
		case KeepOldest:
			if img.ModTime.Before(keeper.ModTime) {
				keeper = img
			}
		case KeepLargest:
			if img.Size > keeper.Size {
				keeper = img
			}
		case KeepFirst:
			if len(img.Path) < len(keeper.Path) ||
				(len(img.Path) == len(keeper.Path) && img.Path < keeper.Path) {
				keeper = img
			}
		}
	}
	return keeper
}

// removeFile either permanently deletes a file or moves it to the trash dir.
func (s *Service) removeFile(img models.Image) error {
	if s.HardDelete {
		return os.Remove(img.Path)
	}
	return s.quarantine(img)
}

// quarantine moves a file into the trash dir under a collision-proof name.
func (s *Service) quarantine(img models.Image) error {
	trash := s.trashDir()
	if err := os.MkdirAll(trash, 0o755); err != nil {
		return err
	}
	dest := filepath.Join(trash, fmt.Sprintf("%d_%s", img.ID, filepath.Base(img.Path)))

	if err := os.Rename(img.Path, dest); err == nil {
		return nil
	}
	// Rename fails across filesystems; fall back to copy + remove.
	if err := copyFile(img.Path, dest); err != nil {
		return err
	}
	return os.Remove(img.Path)
}

func (s *Service) trashDir() string {
	if s.TrashDir != "" {
		return s.TrashDir
	}
	return filepath.Join(".", ".imgdedupe-trash")
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		return err
	}
	return out.Close()
}
