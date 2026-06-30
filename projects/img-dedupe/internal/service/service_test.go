package service

import (
	"image"
	"image/color"
	"image/png"
	"io/fs"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/erancihan/img-dedupe/internal/models"
	"gorm.io/gorm"
)

func newTestService(t *testing.T) *Service {
	t.Helper()
	svc, err := New(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	t.Cleanup(func() { _ = svc.Close() })
	return svc
}

func writePNG(t *testing.T, path string, c color.Color) {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 16, 16))
	for x := 0; x < 16; x++ {
		for y := 0; y < 16; y++ {
			img.Set(x, y, c)
		}
	}
	f, err := os.Create(path)
	if err != nil {
		t.Fatalf("create %s: %v", path, err)
	}
	defer f.Close()
	if err := png.Encode(f, img); err != nil {
		t.Fatalf("encode %s: %v", path, err)
	}
}

func copyTestFile(t *testing.T, src, dst string) {
	t.Helper()
	b, err := os.ReadFile(src)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(dst, b, 0o644); err != nil {
		t.Fatal(err)
	}
}

// setupImages writes red, blue and a byte-identical copy of red, so there is
// exactly one duplicate group (red, 2 copies) among 3 files.
func setupImages(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	writePNG(t, filepath.Join(dir, "red.png"), color.RGBA{255, 0, 0, 255})
	writePNG(t, filepath.Join(dir, "blue.png"), color.RGBA{0, 0, 255, 255})
	copyTestFile(t, filepath.Join(dir, "red.png"), filepath.Join(dir, "red2.png"))
	return dir
}

func countPNGs(t *testing.T, dir string) int {
	t.Helper()
	n := 0
	_ = filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
		if err == nil && !d.IsDir() && filepath.Ext(path) == ".png" {
			n++
		}
		return nil
	})
	return n
}

func TestRegisterFolder(t *testing.T) {
	svc := newTestService(t)
	dir := t.TempDir()

	f1, err := svc.RegisterFolder(dir)
	if err != nil {
		t.Fatalf("RegisterFolder: %v", err)
	}
	if f1.ID == 0 {
		t.Fatal("expected non-zero folder ID")
	}

	// Registering the same folder is idempotent.
	f2, err := svc.RegisterFolder(dir)
	if err != nil {
		t.Fatalf("re-RegisterFolder: %v", err)
	}
	if f2.ID != f1.ID {
		t.Fatalf("re-register produced new ID %d (want %d)", f2.ID, f1.ID)
	}

	folders, err := svc.ListFolders()
	if err != nil {
		t.Fatalf("ListFolders: %v", err)
	}
	if len(folders) != 1 {
		t.Fatalf("got %d folders, want 1", len(folders))
	}

	// Non-existent path is rejected.
	if _, err := svc.RegisterFolder(filepath.Join(dir, "nope")); err == nil {
		t.Fatal("expected error registering non-existent path")
	}

	// A file (not a directory) is rejected.
	file := filepath.Join(dir, "f.txt")
	if err := os.WriteFile(file, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.RegisterFolder(file); err == nil {
		t.Fatal("expected error registering a file")
	}
}

func TestScanAndFindDuplicates(t *testing.T) {
	svc := newTestService(t)
	dir := setupImages(t)

	if _, err := svc.RegisterFolder(dir); err != nil {
		t.Fatal(err)
	}

	res, err := svc.ScanFolders(0)
	if err != nil {
		t.Fatalf("ScanFolders: %v", err)
	}
	if res.ImagesFound != 3 || res.ImagesAdded != 3 {
		t.Fatalf("scan found=%d added=%d, want 3/3", res.ImagesFound, res.ImagesAdded)
	}

	// A second scan updates rather than adds.
	res2, err := svc.ScanFolders(0)
	if err != nil {
		t.Fatal(err)
	}
	if res2.ImagesAdded != 0 || res2.ImagesUpdated != 3 {
		t.Fatalf("rescan added=%d updated=%d, want 0/3", res2.ImagesAdded, res2.ImagesUpdated)
	}

	groups, err := svc.FindDuplicates()
	if err != nil {
		t.Fatalf("FindDuplicates: %v", err)
	}
	if len(groups) != 1 {
		t.Fatalf("got %d duplicate groups, want 1", len(groups))
	}
	if len(groups[0].Images) != 2 {
		t.Fatalf("got %d images in group, want 2", len(groups[0].Images))
	}
	if groups[0].Images[0].Width != 16 || groups[0].Images[0].Height != 16 {
		t.Fatalf("dimensions not captured: %dx%d", groups[0].Images[0].Width, groups[0].Images[0].Height)
	}
}

func TestResolveDuplicatesQuarantine(t *testing.T) {
	svc := newTestService(t)
	dir := setupImages(t)
	trash := t.TempDir()
	svc.TrashDir = trash

	if _, err := svc.RegisterFolder(dir); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.ScanFolders(0); err != nil {
		t.Fatal(err)
	}

	// Dry run changes nothing on disk.
	dry, err := svc.ResolveDuplicates(KeepFirst, true)
	if err != nil {
		t.Fatal(err)
	}
	if len(dry.Planned) != 1 {
		t.Fatalf("dry run planned=%d, want 1", len(dry.Planned))
	}
	if got := countPNGs(t, dir); got != 3 {
		t.Fatalf("after dry run source has %d files, want 3", got)
	}

	// Real run moves the one extra into the trash dir.
	res, err := svc.ResolveDuplicates(KeepFirst, false)
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Planned) != 1 {
		t.Fatalf("resolve planned=%d, want 1", len(res.Planned))
	}
	if got := countPNGs(t, dir); got != 2 {
		t.Fatalf("after resolve source has %d files, want 2", got)
	}
	if got := countPNGs(t, trash); got != 1 {
		t.Fatalf("trash has %d files, want 1", got)
	}

	groups, err := svc.FindDuplicates()
	if err != nil {
		t.Fatal(err)
	}
	if len(groups) != 0 {
		t.Fatalf("got %d groups after resolve, want 0", len(groups))
	}
}

func TestPickKeeper(t *testing.T) {
	imgs := []models.Image{
		{Model: gorm.Model{ID: 1}, Path: "/a/long/path.png", Size: 100, ModTime: time.Unix(100, 0)},
		{Model: gorm.Model{ID: 2}, Path: "/b.png", Size: 300, ModTime: time.Unix(300, 0)},
		{Model: gorm.Model{ID: 3}, Path: "/c/x.png", Size: 200, ModTime: time.Unix(200, 0)},
	}
	cases := map[KeepPolicy]uint{
		KeepNewest:  2,
		KeepOldest:  1,
		KeepLargest: 2,
		KeepFirst:   2, // "/b.png" is the shortest path
	}
	for policy, wantID := range cases {
		if got := pickKeeper(imgs, policy); got.ID != wantID {
			t.Errorf("policy %q kept ID %d, want %d", policy, got.ID, wantID)
		}
	}
}

// writeGradientPNG writes a 64x64 horizontal greyscale gradient. The same shape
// with a different brightness base produces an identical difference-hash but
// different bytes — i.e. a near-duplicate that is not a byte-identical one.
func writeGradientPNG(t *testing.T, path string, base int) {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 64, 64))
	for x := 0; x < 64; x++ {
		v := uint8(base + x*3) // monotonic in x; base in [10,40] never clamps
		for y := 0; y < 64; y++ {
			img.Set(x, y, color.RGBA{v, v, v, 255})
		}
	}
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	if err := png.Encode(f, img); err != nil {
		t.Fatal(err)
	}
}

func TestFindSimilar(t *testing.T) {
	svc := newTestService(t)
	dir := t.TempDir()

	// a and a2 are the same gradient at different brightness: identical
	// perceptual hash, different bytes. b is a flat colour: clearly different.
	writeGradientPNG(t, filepath.Join(dir, "a.png"), 30)
	writeGradientPNG(t, filepath.Join(dir, "a2.png"), 10)
	writePNG(t, filepath.Join(dir, "b.png"), color.RGBA{128, 128, 128, 255})

	if _, err := svc.RegisterFolder(dir); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.ScanFolders(0); err != nil {
		t.Fatal(err)
	}

	// Exact detection finds nothing — all three files differ byte-for-byte.
	dups, err := svc.FindDuplicates()
	if err != nil {
		t.Fatal(err)
	}
	if len(dups) != 0 {
		t.Fatalf("FindDuplicates got %d groups, want 0 (no byte-identical files)", len(dups))
	}

	// Perceptual detection clusters a.png with a2.png, but not b.png.
	sims, err := svc.FindSimilar(10)
	if err != nil {
		t.Fatal(err)
	}
	if len(sims) != 1 {
		t.Fatalf("FindSimilar got %d groups, want 1", len(sims))
	}
	names := map[string]bool{}
	for _, img := range sims[0].Images {
		names[filepath.Base(img.Path)] = true
	}
	if len(sims[0].Images) != 2 || !names["a.png"] || !names["a2.png"] {
		t.Fatalf("similar group = %v, want {a.png, a2.png}", names)
	}
}
