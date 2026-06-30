// Package spatial provides a uniform-grid spatial hash for fast 2D neighbor
// queries. It is a domain-agnostic engine utility: it stores arbitrary payloads
// at points and answers "what is near here?" in roughly O(1) average per query,
// turning O(n^2) all-pairs neighbor scans into ~O(n).
//
// It is a plain data structure — it knows nothing about the ECS or any
// component. A system snapshots positions into the grid each tick and queries
// it; both the negotiation matchmaker and the boids flock use the same Grid.
package spatial

import "math"

// Grid is a uniform spatial hash mapping cells of a fixed size to the payloads
// inside them. Choose a cell size near the typical query radius so a radius
// query touches only a handful of cells.
//
// Iteration order in Query is deterministic given deterministic insertion order
// (cells are visited in sorted coordinate order, payloads in insertion order),
// so consumers whose results depend on order stay reproducible.
type Grid[T any] struct {
	inv   float64 // 1 / cellSize
	cells map[[2]int32][]entry[T]
}

type entry[T any] struct {
	x, y float64
	val  T
}

// NewGrid creates a grid with the given cell size (clamped to a positive value).
func NewGrid[T any](cellSize float64) *Grid[T] {
	if cellSize <= 0 {
		cellSize = 1
	}
	return &Grid[T]{inv: 1 / cellSize, cells: make(map[[2]int32][]entry[T])}
}

func (g *Grid[T]) key(x, y float64) [2]int32 {
	return [2]int32{int32(math.Floor(x * g.inv)), int32(math.Floor(y * g.inv))}
}

// Insert adds a payload at point (x, y).
func (g *Grid[T]) Insert(x, y float64, val T) {
	k := g.key(x, y)
	g.cells[k] = append(g.cells[k], entry[T]{x: x, y: y, val: val})
}

// Clear empties the grid while retaining each cell's backing capacity, so the
// grid can be refilled each tick without reallocating.
func (g *Grid[T]) Clear() {
	for k, s := range g.cells {
		g.cells[k] = s[:0]
	}
}

// Query invokes visit for every payload within radius of (x, y). It visits cells
// in sorted coordinate order and payloads in insertion order. The point itself,
// if inserted, is included — callers that inserted self must skip it.
func (g *Grid[T]) Query(x, y, radius float64, visit func(val T)) {
	r2 := radius * radius
	minX := int32(math.Floor((x - radius) * g.inv))
	maxX := int32(math.Floor((x + radius) * g.inv))
	minY := int32(math.Floor((y - radius) * g.inv))
	maxY := int32(math.Floor((y + radius) * g.inv))

	for cx := minX; cx <= maxX; cx++ {
		for cy := minY; cy <= maxY; cy++ {
			for _, e := range g.cells[[2]int32{cx, cy}] {
				dx := e.x - x
				dy := e.y - y
				if dx*dx+dy*dy <= r2 {
					visit(e.val)
				}
			}
		}
	}
}
