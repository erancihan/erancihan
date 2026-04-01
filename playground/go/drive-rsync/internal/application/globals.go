package application

import (
	"drive-rsync/internal/config"

	"google.golang.org/api/drive/v3"
)

var (
	// DriveService is the authenticated Google Drive API service.
	DriveService *drive.Service

	// Config is the application-level configuration (data dir, credentials, etc.).
	Config *config.AppConfig
)
