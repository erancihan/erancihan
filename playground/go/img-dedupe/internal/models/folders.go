package models

import (
	"gorm.io/gorm"
)

/**
This is the model for folders where the application will search for images.
*/

type Folder struct {
	gorm.Model

	Path string `json:"path"`
}
