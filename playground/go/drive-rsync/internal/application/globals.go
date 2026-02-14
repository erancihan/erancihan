package application

import "google.golang.org/api/drive/v3"

const ConfigFileName = ".gdrsync.json"

var DriveService *drive.Service
