import simd

/// A 2D vertex for the HUD, positioned directly in normalised device
/// coordinates. Its layout must match `HUDVertex` in `hud.metal`.
struct HUDVertex {
    var position: SIMD2<Float>
    var color: Vec4
}
