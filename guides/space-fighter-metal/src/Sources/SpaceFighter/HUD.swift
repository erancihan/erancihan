import simd

/// Builds the heads-up display as a flat list of coloured triangles in
/// normalised device coordinates (-1…1, origin centre, +Y up). No fonts, no
/// textures — just a crosshair, a hull bar, and a red flash when you're hit.
/// Numeric readouts (score, hull %) go in the window title to keep this simple;
/// chapter 11 points at how to add real text.
enum HUD {
    static func build(stats: GameStats, aspect: Float) -> [HUDVertex] {
        var v: [HUDVertex] = []

        // Full-screen damage flash, drawn first so everything sits on top of it.
        if stats.hitFlash > 0 {
            let a = 0.35 * min(stats.hitFlash / 0.5, 1)
            appendRect(&v, cx: 0, cy: 0, hw: 1, hh: 1, color: Vec4(1, 0.1, 0.1, a))
        }

        // Reticle: a cyan cross at screen centre. Divide X extents by the aspect
        // ratio so it stays square on a wide window.
        let cyan = Vec4(0.4, 1.0, 0.9, 0.9)
        appendRect(&v, cx: 0, cy: 0, hw: 0.035 / aspect, hh: 0.004, color: cyan) // horizontal
        appendRect(&v, cx: 0, cy: 0, hw: 0.004 / aspect, hh: 0.035, color: cyan) // vertical

        // Hull bar, bottom-left. Background then fill; the fill shifts green→red
        // as the hull drops.
        let frac = max(0, min(stats.playerHealth / stats.playerMaxHealth, 1))
        let barX: Float = -0.72, barY: Float = -0.9
        let barHW: Float = 0.22, barHH: Float = 0.02
        appendRect(&v, cx: barX, cy: barY, hw: barHW, hh: barHH, color: Vec4(0.1, 0.1, 0.12, 0.7))
        let fillHW = barHW * frac
        let fillColor = Vec4(1 - frac, 0.2 + 0.7 * frac, 0.25, 0.95)
        appendRect(&v, cx: barX - barHW + fillHW, cy: barY, hw: fillHW, hh: barHH, color: fillColor)

        return v
    }

    /// Append two triangles forming an axis-aligned rectangle.
    private static func appendRect(_ out: inout [HUDVertex], cx: Float, cy: Float, hw: Float, hh: Float, color: Vec4) {
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
