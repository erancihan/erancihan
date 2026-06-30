package service

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/erancihan/img-dedupe/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// RegisterFolder validates that path exists and is a directory, then stores its
// absolute form. Registering the same folder twice is a no-op.
func (s *Service) RegisterFolder(path string) (*models.Folder, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve path %q: %w", path, err)
	}

	info, err := os.Stat(abs)
	if err != nil {
		return nil, fmt.Errorf("cannot access folder %q: %w", abs, err)
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("%q is not a directory", abs)
	}

	folder := models.Folder{Path: abs}
	if err := s.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "path"}},
		DoNothing: true,
	}).Create(&folder).Error; err != nil {
		return nil, fmt.Errorf("failed to register folder: %w", err)
	}

	// On a conflict the insert is skipped and ID stays zero; reload by path.
	if folder.ID == 0 {
		if err := s.DB.Where("path = ?", abs).First(&folder).Error; err != nil {
			return nil, fmt.Errorf("failed to load folder: %w", err)
		}
	}

	return &folder, nil
}

// ListFolders returns every registered folder, ordered by path.
func (s *Service) ListFolders() ([]models.Folder, error) {
	var folders []models.Folder
	if err := s.DB.Order("path").Find(&folders).Error; err != nil {
		return nil, fmt.Errorf("failed to list folders: %w", err)
	}
	return folders, nil
}

// RemoveFolder deletes a folder by ID, and its indexed images when withImages
// is true. The image files on disk are left untouched.
func (s *Service) RemoveFolder(id uint, withImages bool) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		if withImages {
			if err := tx.Where("folder_id = ?", id).Delete(&models.Image{}).Error; err != nil {
				return fmt.Errorf("failed to delete folder images: %w", err)
			}
		}
		if err := tx.Delete(&models.Folder{}, id).Error; err != nil {
			return fmt.Errorf("failed to delete folder: %w", err)
		}
		return nil
	})
}
