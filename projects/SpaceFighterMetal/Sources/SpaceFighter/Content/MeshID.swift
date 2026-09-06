/// Names the art gameplay can ask for. A component says `Renderable(mesh:
/// .enemy, …)` and never touches a buffer — this is the whole reason Metal
/// stays out of `Components/` and `Systems/`.
enum MeshID: Int, CaseIterable {
    case ship
    case enemy
    case projectile
}

extension MeshID {
    /// The shape behind this id. Add a case above and this switch stops
    /// compiling until you say what it looks like — which is the point.
    var mesh: Mesh {
        switch self {
        case .ship:       return ShipMesh.make()
        case .enemy:      return EnemyMesh.make()
        case .projectile: return ProjectileMesh.make()
        }
    }
}

/// How a mesh should be drawn. The renderer owns the pipelines; the content
/// says which one it belongs in.
enum Material {
    case lit     // shaded by the sun direction
    case glow    // emissive, no lighting, doesn't occlude
}

extension MeshID {
    var material: Material {
        switch self {
        case .ship, .enemy: return .lit
        case .projectile:   return .glow
        }
    }
}

/// Backdrop geometry the renderer owns outright. Unlike `MeshID`, nothing in
/// gameplay ever names one of these — the renderer draws them on its own
/// initiative, so they never appear on a `Renderable`.
enum SceneryID: CaseIterable {
    case starfield
    case grid

    static let starSpan: Float = 480     // side length of the star tiling cube
    static let gridSpacing: Float = 6    // world units between grid lines

    var mesh: Mesh {
        switch self {
        case .starfield: return SceneryMesh.starfield(count: 2600, span: Self.starSpan)
        case .grid:      return SceneryMesh.grid(halfExtent: 240, spacing: Self.gridSpacing)
        }
    }
}