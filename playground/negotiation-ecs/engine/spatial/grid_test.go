package spatial

import (
	"math/rand"
	"testing"
)

func TestQueryFindsWithinRadius(t *testing.T) {
	g := NewGrid[int](10)
	g.Insert(0, 0, 1)
	g.Insert(5, 0, 2)   // within radius 6
	g.Insert(100, 0, 3) // far away

	seen := map[int]bool{}
	g.Query(0, 0, 6, func(v int) { seen[v] = true })

	if !seen[1] || !seen[2] {
		t.Fatalf("expected to find ids 1 and 2, got %v", seen)
	}
	if seen[3] {
		t.Fatal("id 3 is outside the radius and should not be found")
	}
}

func TestQueryRadiusBoundaryAndCells(t *testing.T) {
	g := NewGrid[int](1) // tiny cells force multi-cell spanning
	// Points on a ring of radius ~5 around origin.
	g.Insert(5, 0, 1)
	g.Insert(0, 5, 2)
	g.Insert(4, 3, 3) // dist exactly 5
	g.Insert(6, 0, 4) // dist 6, outside r=5

	var count int
	g.Query(0, 0, 5, func(int) { count++ })
	if count != 3 {
		t.Fatalf("found %d within r=5, want 3", count)
	}
}

// TestQueryDeterministicOrder: with deterministic insertion, repeated queries
// visit payloads in the same order (cells sorted, then insertion order) — not
// Go's randomized map order.
func TestQueryDeterministicOrder(t *testing.T) {
	build := func() []int {
		g := NewGrid[int](7)
		for i := 0; i < 200; i++ {
			x := float64((i * 13) % 100)
			y := float64((i * 29) % 100)
			g.Insert(x, y, i)
		}
		var order []int
		g.Query(50, 50, 40, func(v int) { order = append(order, v) })
		return order
	}
	a, b := build(), build()
	if len(a) != len(b) {
		t.Fatalf("query sizes differ: %d vs %d", len(a), len(b))
	}
	for i := range a {
		if a[i] != b[i] {
			t.Fatalf("query order not deterministic at %d: %d vs %d", i, a[i], b[i])
		}
	}
}

func TestClearReusesGrid(t *testing.T) {
	g := NewGrid[int](10)
	g.Insert(1, 1, 1)
	g.Clear()
	var count int
	g.Query(1, 1, 5, func(int) { count++ })
	if count != 0 {
		t.Fatalf("grid not empty after Clear: %d", count)
	}
	g.Insert(2, 2, 2)
	count = 0
	g.Query(2, 2, 5, func(int) { count++ })
	if count != 1 {
		t.Fatalf("grid not usable after Clear+Insert: %d", count)
	}
}

// naiveCount is the O(n^2) reference: count points within radius by brute force.
func naiveCount(pts [][2]float64, x, y, r float64) int {
	r2 := r * r
	c := 0
	for _, p := range pts {
		dx, dy := p[0]-x, p[1]-y
		if dx*dx+dy*dy <= r2 {
			c++
		}
	}
	return c
}

// TestGridMatchesBruteForce: the grid returns exactly the brute-force neighbor
// set for many random queries.
func TestGridMatchesBruteForce(t *testing.T) {
	rng := rand.New(rand.NewSource(7))
	const n = 500
	pts := make([][2]float64, n)
	g := NewGrid[int](25)
	for i := 0; i < n; i++ {
		x, y := rng.Float64()*1000, rng.Float64()*1000
		pts[i] = [2]float64{x, y}
		g.Insert(x, y, i)
	}

	for q := 0; q < 50; q++ {
		x, y := rng.Float64()*1000, rng.Float64()*1000
		r := 20 + rng.Float64()*80
		want := naiveCount(pts, x, y, r)
		got := 0
		g.Query(x, y, r, func(int) { got++ })
		if got != want {
			t.Fatalf("query (%.1f,%.1f,r=%.1f): grid=%d brute=%d", x, y, r, got, want)
		}
	}
}

// makePoints builds n deterministic points in a square.
func makePoints(n int) [][2]float64 {
	rng := rand.New(rand.NewSource(1))
	pts := make([][2]float64, n)
	for i := range pts {
		pts[i] = [2]float64{rng.Float64() * 1000, rng.Float64() * 1000}
	}
	return pts
}

// Benchmarks compare all-pairs neighbor finding as the entity count grows. The
// naive scan is O(n^2) (time ~4x per 2x n); the grid is ~O(n) (time ~2x per 2x
// n) because each query touches only nearby cells. Run:
//
//	go test ./spatial -bench=Neighbors -benchmem
var benchSizes = []int{1000, 2000, 4000, 8000}

const benchRadius = 40.0

func BenchmarkNeighborsNaive(b *testing.B) {
	for _, n := range benchSizes {
		pts := makePoints(n)
		b.Run(sizeName(n), func(b *testing.B) {
			for it := 0; it < b.N; it++ {
				total := 0
				for i := range pts {
					total += naiveCount(pts, pts[i][0], pts[i][1], benchRadius)
				}
				_ = total
			}
		})
	}
}

func BenchmarkNeighborsGrid(b *testing.B) {
	for _, n := range benchSizes {
		pts := makePoints(n)
		g := NewGrid[int](benchRadius)
		b.Run(sizeName(n), func(b *testing.B) {
			for it := 0; it < b.N; it++ {
				g.Clear()
				for i := range pts {
					g.Insert(pts[i][0], pts[i][1], i)
				}
				total := 0
				for i := range pts {
					g.Query(pts[i][0], pts[i][1], benchRadius, func(int) { total++ })
				}
				_ = total
			}
		})
	}
}

func sizeName(n int) string {
	switch {
	case n >= 1000:
		return string(rune('0'+n/1000)) + "k"
	default:
		return string(rune('0' + n))
	}
}
