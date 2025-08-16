package models

import (
	"gorm.io/gorm"
)

/***
This is the model for images that will be processed by the application.
*/

type Image struct {
	gorm.Model

	Folder Folder `json:"folder" gorm:"foreignKey:ID"`
}
