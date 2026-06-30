package models

import (
	"time"

	"gorm.io/gorm"
)

// Image is a single image file discovered while scanning a registered folder.
//
// Hash is the hex-encoded SHA-256 of the file's contents and is what duplicate
// detection groups on. Path is unique so re-scanning updates the existing row.
type Image struct {
	gorm.Model

	Path string `json:"path" gorm:"uniqueIndex"`
	Hash string `json:"hash" gorm:"index"`
	// PHash is the hex-encoded perceptual (difference) hash used for
	// near-duplicate detection. Empty when the image could not be decoded.
	PHash   string    `json:"phash" gorm:"column:phash;index"`
	Size    int64     `json:"size"`
	Width   int       `json:"width"`
	Height  int       `json:"height"`
	ModTime time.Time `json:"mod_time"`

	FolderID uint   `json:"folder_id" gorm:"index"`
	Folder   Folder `json:"-" gorm:"foreignKey:FolderID"`
}
