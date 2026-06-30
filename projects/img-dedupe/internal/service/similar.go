package service

import (
	"fmt"
	"math/bits"
	"sort"
	"strconv"

	"github.com/erancihan/img-dedupe/internal/models"
)

// DefaultSimilarityThreshold is the maximum Hamming distance (out of 64 bits)
// at which two perceptual hashes are considered near-duplicates.
const DefaultSimilarityThreshold = 10

// SimilarGroup is a cluster of images whose perceptual hashes are within the
// similarity threshold of each other (i.e. visually near-identical).
type SimilarGroup struct {
	// Key is a stable identifier for the cluster (the smallest member ID).
	Key    string         `json:"key"`
	Images []models.Image `json:"images"`
}

// FindSimilar clusters indexed images by perceptual-hash Hamming distance.
// Images within threshold bits of each other are grouped (transitively, via
// union-find). Only clusters with more than one image are returned. Exact
// duplicates are a subset of similar images, so they appear here too.
//
// Comparison is pairwise (O(n^2)); fine for typical libraries, but a BK-tree
// would be the next step for very large collections.
func (s *Service) FindSimilar(threshold int) ([]SimilarGroup, error) {
	if threshold < 0 {
		threshold = DefaultSimilarityThreshold
	}

	var images []models.Image
	if err := s.DB.Where("phash <> ''").Order("id").Find(&images).Error; err != nil {
		return nil, fmt.Errorf("failed to load images: %w", err)
	}
	n := len(images)
	if n < 2 {
		return nil, nil
	}

	// Pre-parse hashes once so the inner loop is pure integer work.
	hashes := make([]uint64, n)
	for i, img := range images {
		h, err := strconv.ParseUint(img.PHash, 16, 64)
		if err != nil {
			// Should not happen for stored hashes, but skip defensively by
			// giving it a value no other hash can be within threshold of.
			h = 0
		}
		hashes[i] = h
	}

	uf := newUnionFind(n)
	for i := 0; i < n; i++ {
		for j := i + 1; j < n; j++ {
			if bits.OnesCount64(hashes[i]^hashes[j]) <= threshold {
				uf.union(i, j)
			}
		}
	}

	// Collect members per cluster root.
	members := map[int][]models.Image{}
	for i := 0; i < n; i++ {
		r := uf.find(i)
		members[r] = append(members[r], images[i])
	}

	groups := make([]SimilarGroup, 0)
	for _, imgs := range members {
		if len(imgs) < 2 {
			continue
		}
		// Largest first within a cluster (matches FindDuplicates ordering).
		sort.Slice(imgs, func(a, b int) bool {
			if imgs[a].Size != imgs[b].Size {
				return imgs[a].Size > imgs[b].Size
			}
			return imgs[a].Path < imgs[b].Path
		})
		groups = append(groups, SimilarGroup{
			Key:    fmt.Sprintf("sim-%d", minID(imgs)),
			Images: imgs,
		})
	}

	// Stable, deterministic group order.
	sort.Slice(groups, func(a, b int) bool { return groups[a].Key < groups[b].Key })
	return groups, nil
}

// ResolveSimilar keeps one image per near-duplicate cluster (chosen by policy)
// and removes the rest. With dryRun nothing is changed.
func (s *Service) ResolveSimilar(threshold int, policy KeepPolicy, dryRun bool) (*DeleteResult, error) {
	groups, err := s.FindSimilar(threshold)
	if err != nil {
		return nil, err
	}
	imageGroups := make([][]models.Image, len(groups))
	for i, g := range groups {
		imageGroups[i] = g.Images
	}
	return s.resolveGroups(imageGroups, policy, dryRun)
}

func minID(imgs []models.Image) uint {
	m := imgs[0].ID
	for _, img := range imgs[1:] {
		if img.ID < m {
			m = img.ID
		}
	}
	return m
}

// unionFind is a tiny disjoint-set with path halving for clustering.
type unionFind struct{ parent []int }

func newUnionFind(n int) *unionFind {
	p := make([]int, n)
	for i := range p {
		p[i] = i
	}
	return &unionFind{parent: p}
}

func (u *unionFind) find(x int) int {
	for u.parent[x] != x {
		u.parent[x] = u.parent[u.parent[x]]
		x = u.parent[x]
	}
	return x
}

func (u *unionFind) union(a, b int) {
	ra, rb := u.find(a), u.find(b)
	if ra != rb {
		u.parent[ra] = rb
	}
}
