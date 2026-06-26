package models

import (
	"gorm.io/gorm"
)

// Folder is a directory that the application scans for images.
type Folder struct {
	gorm.Model

	Path string `json:"path" gorm:"uniqueIndex"`
}
