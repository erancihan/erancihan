package application

import "time"

type SyncConfig struct {
	RemoteFolderID string    `json:"remote_folder_id"`
	RemotePathName string    `json:"remote_path_name"`
	LastSync       time.Time `json:"last_sync"`
}
