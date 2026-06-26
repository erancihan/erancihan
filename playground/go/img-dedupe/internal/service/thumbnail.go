package service

import (
	"bytes"
	"fmt"

	"github.com/disintegration/imaging"
	"github.com/erancihan/img-dedupe/internal/models"
)

// ImageByID returns a stored image by its ID.
func (s *Service) ImageByID(id uint) (*models.Image, error) {
	var img models.Image
	if err := s.DB.First(&img, id).Error; err != nil {
		return nil, err
	}
	return &img, nil
}

// Thumbnail decodes the image with the given ID and returns a JPEG no larger
// than maxDim on its longest side (defaults to 256px).
func (s *Service) Thumbnail(id uint, maxDim int) ([]byte, error) {
	img, err := s.ImageByID(id)
	if err != nil {
		return nil, err
	}

	src, err := imaging.Open(img.Path, imaging.AutoOrientation(true))
	if err != nil {
		return nil, fmt.Errorf("failed to open image: %w", err)
	}
	if maxDim <= 0 {
		maxDim = 256
	}
	thumb := imaging.Fit(src, maxDim, maxDim, imaging.Lanczos)

	var buf bytes.Buffer
	if err := imaging.Encode(&buf, thumb, imaging.JPEG, imaging.JPEGQuality(80)); err != nil {
		return nil, fmt.Errorf("failed to encode thumbnail: %w", err)
	}
	return buf.Bytes(), nil
}
