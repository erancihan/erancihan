import simd

/// Builds the HUD as coloured triangles in normalised device coordinates.
/// A pure function: stats in, vertices out.
enum HUDSystem {
    static func build(stats: GameStats, aspect: Float) -> [HUDVertex] {
        var v: [HUDVertex] = []

        if stats.hitFlash > 0 {
            let a = 0.35 * min(stats.hitFlash / 0.5, 1)
            appendRect(&v, cx: 0, cy: 0, hw: 1, hh: 1, color: Vec4(1, 0.1, 0.1, a))
        }

        let cyan = Vec4(0.4, 1.0, 0.9, 0.9)
        appendRect(&v, cx: 0, cy: 0, hw: 0.035 / aspect, hh: 0.004, color: cyan)
        appendRect(&v, cx: 0, cy: 0, hw: 0.004 / aspect, hh: 0.035, color: cyan)

        let frac = max(0, min(stats.playerHealth / stats.playerMaxHealth, 1))
        let barX: Float = -0.72
        let barY: Float = -0.9
        let barHW: Float = 0.22
        let barHH: Float = 0.02
        appendRect(&v, cx: barX, cy: barY, hw: barHW, hh: barHH, color: Vec4(0.1, 0.1, 0.12, 0.7))
        let fillHW = barHW * frac
        let fillColor = Vec4(1 - frac, 0.2 + 0.7 * frac, 0.25, 0.95)
        appendRect(&v, cx: barX - barHW + fillHW, cy: barY, hw: fillHW, hh: barHH, color: fillColor)

        return v
    }

    /// Append two triangles forming an axis-aligned rectangle.
    private static func appendRect(
        _ out: inout [HUDVertex], cx: Float, cy: Float, hw: Float, hh: Float, color: Vec4
    ) {
        let a = SIMD2<Float>(cx - hw, cy - hh)
        let b = SIMD2<Float>(cx + hw, cy - hh)
        let c = SIMD2<Float>(cx + hw, cy + hh)
        let d = SIMD2<Float>(cx - hw, cy + hh)

        out.append(HUDVertex(position: a, color: color))
        out.append(HUDVertex(position: b, color: color))
        out.append(HUDVertex(position: c, color: color))
        out.append(HUDVertex(position: a, color: color))
        out.append(HUDVertex(position: c, color: color))
        out.append(HUDVertex(position: d, color: color))
    }
}
