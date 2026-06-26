// Package service holds img-dedupe's data access and business logic. It is the
// single source of truth shared by both the CLI commands and the web server, so
// the two front ends never duplicate behaviour.
package service

import (
	"fmt"

	"github.com/erancihan/img-dedupe/internal/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Service is the application core: a database handle plus a few deletion knobs.
type Service struct {
	DB *gorm.DB

	// HardDelete permanently removes files instead of moving them to TrashDir.
	HardDelete bool
	// TrashDir is where removed files are moved when HardDelete is false.
	// Empty means "./.imgdedupe-trash".
	TrashDir string
}

// New opens the SQLite database at dsn, runs migrations, and returns a Service.
func New(dsn string) (*Service, error) {
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
		Logger:                                   logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	if err := db.AutoMigrate(&models.Folder{}, &models.Image{}); err != nil {
		return nil, fmt.Errorf("failed to migrate database: %w", err)
	}

	return &Service{DB: db}, nil
}

// Close releases the underlying database connection.
func (s *Service) Close() error {
	sqlDB, err := s.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
