# 09 · Text 🛠️

> **You'll leave this chapter with:** every printable character of a system
> font rasterised once into a texture; a HUD pipeline that draws shapes and
> text with the same vertices and the same draw call; a layout function that
> turns a string and a pixel position into quads; and a HUD that says `WAVE 3`,
> `2400`, `87` and `SPREAD` instead of drawing tally marks.
>
> **Files created:** `Sources/SpaceFighter/Content/Fonts/FontAtlas.swift`,
> `Systems/TextLayout.swift`, `Render/TextAtlasTexture.swift`,
> `Tests/SpaceFighterTests/Ch09TextTests.swift`
> **Files changed:** `Render/Types/HUDVertex.swift`,
> `Content/Shaders/ShaderTypes.metal`, `Content/Shaders/hud.metal`,
> `Render/Renderer.swift`, `Systems/HUDSystem.swift` (rewritten),
> `Game.swift`, `GameView.swift`, `Tests/SpaceFighterTests/BoundaryTests.swift`,
> `Tests/SpaceFighterTests/Ch05CameraTests.swift`,
> `Tests/SpaceFighterTests/Ch06CollisionTests.swift`

The first guide's chapter 13 drew a hull bar and a crosshair out of
rectangles and said, of text, "here's how you'd add it": rasterise glyphs
into a texture, draw textured quads. It's the standard answer, and this
chapter does exactly that — with the two details that make it small. The
glyphs are rasterised by Core Text, which already knows every font on the
machine, so there's no font file to parse. And the atlas gets a solid white
square in one corner, so a rectangle is just a quad that samples the white
square — which means the HUD keeps *one* pipeline and one draw call, and
every rectangle chapter 13 already drew keeps working with one extra field.

This is one of two chapters in the guide that edit `Render/`. It touches the
HUD pipeline and nothing else there.

---

## A font is a texture

A glyph atlas is a bitmap with every character drawn in it once, and a table
saying where each one is. Drawing a string is then looking up each character,
emitting a quad at the pen position with that character's texture
coordinates, and advancing the pen. The GPU does the rest.

**`Sources/SpaceFighter/Content/Fonts/FontAtlas.swift`** — new file:

```swift
import CoreGraphics
import CoreText
import Foundation

/// Where one character lives in the atlas and how to place it on a line.
/// Sizes and offsets are in atlas pixels at the atlas's own point size.
struct Glyph {
    var uvMin: SIMD2<Float>
    var uvMax: SIMD2<Float>
    var size: SIMD2<Float>      // ink box, pixels
    var bearing: SIMD2<Float>   // ink box origin from the pen, pixels (x right, y up)
    var advance: Float          // pen movement after this character, pixels
}
```

Five numbers per character. `uvMin`/`uvMax` say where in the texture; `size`
and `bearing` say where the ink sits relative to the pen — a `g` hangs below
the baseline, a `'` floats above it, and `bearing` is what tells them apart;
`advance` says how far to move for the next character. All of it is in
pixels at the size the atlas was drawn at, and the layout code scales.

**`FontAtlas.swift`** — after `Glyph`:

```swift
/// Content. Every printable ASCII character of one font, rasterised once into
/// a single 8-bit bitmap, plus a solid white block so untextured shapes can
/// share the pipeline. Built on the CPU with Core Text; uploaded by the
/// renderer. Knows nothing about Metal.
struct FontAtlas {
    let width: Int
    let height: Int
    let pixels: [UInt8]          // width * height, one byte of coverage each
    let glyphs: [Character: Glyph]
    let pixelSize: Float         // the point size the atlas was drawn at
    let lineHeight: Float        // ascent + descent, pixels
    let whiteUV: SIMD2<Float>    // the middle of the solid block

    static let standard = FontAtlas.make(fontName: "Menlo", pixelSize: 48)

    static let characters: [Character] = (32...126).map { Character(UnicodeScalar($0)) }
}
```

One byte per pixel — *coverage*, how much of the pixel the glyph's ink
covers, which is exactly what the fragment shader wants as an alpha. Menlo
at 48 pixels: a monospace font, because a HUD that counts up wants digits
that don't shift, and 48 because text is drawn at 20 to 34 pixels and a
texture that's downsampled looks better than one that's upsampled.

`standard` is a `static let`, so the atlas is built once, lazily, the first
time anything asks — including a test, which is why the tests below don't
need a renderer.

It lives in `Content/Fonts/` and imports Core Graphics and Core Text, not
Metal. The boundary test at the end of the chapter adds the directory to the
no-Metal list; it's content, and content doesn't touch the GPU.

**`FontAtlas.swift`**, in `FontAtlas` — after `characters`:

```diff
     static let characters: [Character] = (32...126).map { Character(UnicodeScalar($0)) }
+
+    static func make(fontName: String, pixelSize: Float) -> FontAtlas {
+        let font = CTFontCreateWithName(fontName as CFString, CGFloat(pixelSize), nil)
+        let ascent = Float(CTFontGetAscent(font))
+        let descent = Float(CTFontGetDescent(font))
+        let lineHeight = ascent + descent
+
+        // One cell per character plus one for the white block, in a near-square grid.
+        let count = characters.count + 1
+        let columns = Int(Double(count).squareRoot().rounded(.up))
+        let rows = (count + columns - 1) / columns
+        let cellWidth = Int((pixelSize * 1.1).rounded(.up)) + 2
+        let cellHeight = Int(lineHeight.rounded(.up)) + 2
+        let width = columns * cellWidth
+        let height = rows * cellHeight
+    }
 }
```

Ninety-six cells — ninety-five characters and the white block — in a ten by
ten grid. Each cell is a little wider than the font's size and exactly a
line tall, with a pixel of padding on every side so that linear filtering at
a glyph's edge doesn't bleed its neighbour in. The atlas comes out around
550 by 580 pixels; it doesn't need to be a power of two, and Metal doesn't
care.

**`FontAtlas.swift`**, in `make` — after `let height`:

```diff
         let height = rows * cellHeight
+
+        // Core Graphics draws into memory we own for as long as the context
+        // lives, so the buffer is allocated by hand and copied out at the end.
+        let buffer = UnsafeMutableRawPointer.allocate(byteCount: width * height, alignment: 16)
+        defer { buffer.deallocate() }
+        buffer.initializeMemory(as: UInt8.self, repeating: 0, count: width * height)
+        let colorSpace = CGColorSpaceCreateDeviceGray()
+        let context = CGContext(
+            data: buffer, width: width, height: height, bitsPerComponent: 8,
+            bytesPerRow: width, space: colorSpace, bitmapInfo: CGImageAlphaInfo.none.rawValue)!
+        context.setFillColor(gray: 1, alpha: 1)
+        context.setShouldAntialias(true)
+        context.setAllowsFontSmoothing(false)
```

A `CGContext` that draws into a buffer you hand it. The obvious way to get
that buffer is an array and `withUnsafeMutableBytes` — and that's a bug, the
first of two in this section worth knowing by name. The pointer that closure
gives you is only valid *inside* the closure; a context built from it and
used afterwards draws into memory the array may no longer own. Nothing
crashes. The array just stays full of zeros, the atlas is blank, and
everything downstream is invisible. Allocate the buffer yourself, keep it
alive with `defer`, copy out at the end.

`setAllowsFontSmoothing(false)` turns off subpixel (colour-fringed)
antialiasing, which is meaningless in a single-channel bitmap; ordinary
grayscale antialiasing stays on.

**`FontAtlas.swift`**, in `make` — after `setAllowsFontSmoothing`:

```diff
         context.setAllowsFontSmoothing(false)
+
+        // Cell 0, top-left in memory, which is the *top* of Core Graphics'
+        // bottom-up coordinate space: solid white.
+        context.fill(CGRect(x: 1, y: height - cellHeight + 1, width: cellWidth - 2, height: cellHeight - 2))
+        let whiteUV = SIMD2<Float>(
+            Float(cellWidth) / 2 / Float(width),
+            1 - Float(cellHeight) / 2 / Float(height))
```

The second bug by name. Core Graphics' origin is the *bottom*-left, y going
up; the bytes in the buffer start at the *top*-left, rows going down; and
texture coordinates start at the top-left too, with `v` going down. So a
rectangle drawn at `y: 1` in Core Graphics lands in the last rows of the
buffer, and a UV of `0.95` — near the top — points at empty space. Every
Core Graphics `y` in this function is `height − something` for that reason,
and `whiteUV` is written in texture space directly. If you ever see a HUD
where every rectangle has vanished but the text is fine, the white block is
in the wrong place.

**`FontAtlas.swift`**, in `make` — after `whiteUV`:

```diff
             1 - Float(cellHeight) / 2 / Float(height))
+
+        var glyphs: [Character: Glyph] = [:]
+        for (i, character) in characters.enumerated() {
+            let cell = i + 1
+            let cellX = (cell % columns) * cellWidth
+            let cellY = (cell / columns) * cellHeight  // from the top, in memory rows
+
+            var unichar = [UniChar](String(character).utf16)
+            var glyph = CGGlyph(0)
+            CTFontGetGlyphsForCharacters(font, &unichar, &glyph, 1)
+            var bounds = CGRect.zero
+            CTFontGetBoundingRectsForGlyphs(font, .horizontal, &glyph, &bounds, 1)
+            var advance = CGSize.zero
+            CTFontGetAdvancesForGlyphs(font, .horizontal, &glyph, &advance, 1)
+        }
```

Three Core Text calls per character: which glyph in the font is this
character, how big is its ink, how far does the pen move. `bounds` is
relative to the pen with y up, Core Graphics style — a descender has a
negative `minY`.

**`FontAtlas.swift`**, in the `for` loop — after `CTFontGetAdvancesForGlyphs`:

```diff
             CTFontGetAdvancesForGlyphs(font, .horizontal, &glyph, &advance, 1)
+
+            // Core Graphics is bottom-up: the cell's bottom edge in CG space is
+            // height minus its top edge in memory space.
+            let cgBottom = CGFloat(height - cellY - cellHeight)
+            var origin = CGPoint(
+                x: CGFloat(cellX) + 1 - bounds.minX,
+                y: cgBottom + 1 + CGFloat(descent))
+            if bounds.minY < -CGFloat(descent) { origin.y -= bounds.minY + CGFloat(descent) }
+            CTFontDrawGlyphs(font, &glyph, &origin, 1, context)
+
+            let inkMinX = Float(origin.x + bounds.minX)
+            let inkMaxX = Float(origin.x + bounds.maxX)
+            let inkMinYcg = Float(origin.y + bounds.minY)
+            let inkMaxYcg = Float(origin.y + bounds.maxY)
+            glyphs[character] = Glyph(
+                uvMin: SIMD2<Float>(inkMinX / Float(width), 1 - inkMaxYcg / Float(height)),
+                uvMax: SIMD2<Float>(inkMaxX / Float(width), 1 - inkMinYcg / Float(height)),
+                size: SIMD2<Float>(Float(bounds.width), Float(bounds.height)),
+                bearing: SIMD2<Float>(Float(bounds.minX), Float(bounds.minY)),
+                advance: Float(advance.width))
         }
```

The pen is placed so the glyph's ink starts one pixel inside the cell
horizontally, and its baseline sits one descent above the cell's bottom, so
that descenders fit. Then the glyph is drawn, and the *ink box* — origin plus
bounds — is recorded as texture coordinates, flipped from Core Graphics'
up-going y to the texture's down-going v. A space has empty bounds and a
non-zero advance; that's correct, and the layout code below handles it.

**`FontAtlas.swift`**, in `make` — after the loop:

```diff
         }
+
+        let pixels = [UInt8](UnsafeBufferPointer(start: buffer.assumingMemoryBound(to: UInt8.self), count: width * height))
+        return FontAtlas(
+            width: width, height: height, pixels: pixels, glyphs: glyphs,
+            pixelSize: pixelSize, lineHeight: lineHeight, whiteUV: whiteUV)
     }
```

Copy the buffer into an array the struct can own, and the `defer` frees the
original. This runs once per launch and takes a few milliseconds.

---

## One pipeline for shapes and text

The HUD vertex gains a texture coordinate, in both languages.

**`Sources/SpaceFighter/Render/Types/HUDVertex.swift`** — replace the whole
file:

```swift
import simd

/// A 2D vertex for the HUD, positioned directly in normalised device
/// coordinates and textured from the font atlas. A solid shape points its UVs
/// at the atlas's white block. Its layout must match `HUDVertex` in
/// `ShaderTypes.metal`.
struct HUDVertex {
    var position: SIMD2<Float>
    var uv: SIMD2<Float>
    var color: Vec4
}
```

**`Sources/SpaceFighter/Content/Shaders/ShaderTypes.metal`**:

```diff
-struct HUDVertex     { float2 position; float4 color; };
+struct HUDVertex     { float2 position; float2 uv; float4 color; };
```

Two `float2`s then a `float4`: sixteen bytes, then sixteen — no padding
surprises, the same layout on both sides. The first guide's chapter 06
warned about `float3`; `float2` is the well-behaved one.

**`Sources/SpaceFighter/Content/Shaders/hud.metal`** — replace the whole
file:

```metal
#include <metal_stdlib>
#include "ShaderTypes.metal"
using namespace metal;

struct HUDInOut { float4 position [[position]]; float2 uv; float4 color; };

vertex HUDInOut hud_vertex(
        uint vid [[vertex_id]],
        constant HUDVertex* verts [[buffer(0)]]
    )
{
    HUDInOut out;
    out.position = float4(verts[vid].position, 0.0, 1.0);
    out.uv       = verts[vid].uv;
    out.color    = verts[vid].color;
    return out;
}

fragment float4 hud_fragment(
        HUDInOut in [[stage_in]],
        texture2d<float> atlas [[texture(0)]],
        sampler atlasSampler   [[sampler(0)]]
    )
{
    float coverage = atlas.sample(atlasSampler, in.uv).r;
    return float4(in.color.rgb, in.color.a * coverage);
}
```

The vertex shader passes the UV through. The fragment shader samples one
channel of the atlas — coverage — and multiplies it into the vertex's alpha.
A glyph's edge pixels are half-covered, so they're half-transparent, and
that's antialiasing for free. A rectangle's UVs point at the white block,
coverage is `1.0` everywhere, and it draws exactly as it did before. That
line is the whole reason the white block exists: the shader never has to ask
"is this text or a shape".

**`Sources/SpaceFighter/Render/TextAtlasTexture.swift`** — new file:

```swift
import Metal

/// The font atlas in GPU memory, plus the sampler the HUD reads it with.
struct TextAtlasTexture {
    let texture: MTLTexture
    let sampler: MTLSamplerState

    init?(device: MTLDevice, atlas: FontAtlas) {
        let descriptor = MTLTextureDescriptor.texture2DDescriptor(
            pixelFormat: .r8Unorm, width: atlas.width, height: atlas.height, mipmapped: false)
        descriptor.usage = .shaderRead
        guard let texture = device.makeTexture(descriptor: descriptor) else { return nil }
        atlas.pixels.withUnsafeBytes { raw in
            texture.replace(
                region: MTLRegionMake2D(0, 0, atlas.width, atlas.height), mipmapLevel: 0,
                withBytes: raw.baseAddress!, bytesPerRow: atlas.width)
        }

        let samplerDescriptor = MTLSamplerDescriptor()
        samplerDescriptor.minFilter = .linear
        samplerDescriptor.magFilter = .linear
        samplerDescriptor.sAddressMode = .clampToEdge
        samplerDescriptor.tAddressMode = .clampToEdge
        guard let sampler = device.makeSamplerState(descriptor: samplerDescriptor) else { return nil }

        self.texture = texture
        self.sampler = sampler
    }
}
```

This is the project's first texture, and it's about as simple as one gets:
one channel, eight bits (`r8Unorm` — "red, normalised to 0…1"), no mipmaps,
uploaded once with `replace`. The `withUnsafeBytes` here is fine, unlike the
one in the atlas: `replace` copies the bytes *inside* the closure and keeps
no pointer. The sampler is linear so that text drawn at 24 pixels from a
48-pixel atlas is smooth, and clamps at the edges so nothing wraps.

**`Sources/SpaceFighter/Render/Renderer.swift`**, in `Renderer` — hold it:

```diff
     private let rhi: RHIDevice
     private let pipelines: Pipelines
     private let meshes: MeshRegistry
+    private let textAtlas: TextAtlasTexture
```

**`Renderer.swift`**, in `init` — build it, after `cache.flush()`:

```diff
         cache.flush()

+        guard let textAtlas = TextAtlasTexture(device: rhi.device, atlas: .standard) else {
+            print("Could not upload the font atlas")
+            return nil
+        }
+
         self.rhi = rhi
         self.pipelines = pipelines
         self.meshes = MeshRegistry(device: rhi.device)
+        self.textAtlas = textAtlas
```

**`Renderer.swift`**, in `drawHUD` — bind it:

```diff
         enc.setRenderPipelineState(pipelines.hud)
         enc.setDepthStencilState(pipelines.noDepth)
+        enc.setFragmentTexture(textAtlas.texture, index: 0)
+        enc.setFragmentSamplerState(textAtlas.sampler, index: 0)
         let buffer = device.makeBuffer(
```

Two binds, matching the `[[texture(0)]]` and `[[sampler(0)]]` in the shader.
That's every change to `Render/` in this chapter: a texture type, nine lines
in the renderer, and one field on a vertex. The pipeline descriptor in
`Pipelines.swift` doesn't change at all — a fragment shader that samples a
texture is the same *kind* of pipeline as one that doesn't.

---

## Laying out a line

**`Sources/SpaceFighter/Systems/TextLayout.swift`** — new file:

```swift
import simd

enum TextAlign {
    case left
    case center
    case right
}

/// Turns strings into HUD quads. Positions are in pixels from the top-left of
/// the viewport; the atlas says how wide each character is; the viewport says
/// how to get from pixels to normalised device coordinates.
enum TextLayout {
    /// Width of `text` at `size` pixels, before alignment.
    static func width(of text: String, size: Float, atlas: FontAtlas = .standard) -> Float {
        let scale = size / atlas.pixelSize
        return text.reduce(0) { $0 + (atlas.glyphs[$1]?.advance ?? 0) * scale }
    }
}
```

The HUD has been working in normalised device coordinates since the first
guide, and NDC is a bad unit for text: a character that's `0.05` tall is a
different number of pixels on every window. So text is placed in *pixels
from the top-left*, the way every 2D UI system does it, and converted at the
last moment. `width` is what alignment needs: the sum of the advances,
scaled from the atlas's size to the requested one.

**`TextLayout.swift`**, in `TextLayout` — after `width`:

```diff
+    /// Append quads for `text`. `origin` is the pen position of the first
+    /// character's baseline, in pixels from the viewport's top-left.
+    static func append(
+        _ text: String, at origin: SIMD2<Float>, size: Float, color: Vec4, align: TextAlign = .left,
+        viewport: SIMD2<Float>, atlas: FontAtlas = .standard, into out: inout [HUDVertex]
+    ) {
+        let scale = size / atlas.pixelSize
+        var pen = origin
+        switch align {
+        case .left: break
+        case .center: pen.x -= width(of: text, size: size, atlas: atlas) / 2
+        case .right: pen.x -= width(of: text, size: size, atlas: atlas)
+        }
+
+        for character in text {
+            guard let g = atlas.glyphs[character] else { continue }
+            if g.size.x > 0 && g.size.y > 0 {
+                let left = pen.x + g.bearing.x * scale
+                let right = left + g.size.x * scale
+                let bottom = pen.y - g.bearing.y * scale       // pixels, y down
+                let top = bottom - g.size.y * scale
+                appendQuad(
+                    &out,
+                    min: toNDC(SIMD2<Float>(left, bottom), viewport),
+                    max: toNDC(SIMD2<Float>(right, top), viewport),
+                    uvMin: g.uvMin, uvMax: g.uvMax, color: color)
+            }
+            pen.x += g.advance * scale
+        }
+    }
```

The loop is the atlas's table, applied: for each character, a quad at the
pen plus the bearing, sized by the ink box, textured by the UVs; then the pen
advances. A character with no ink — a space — emits no quad and still moves
the pen. A character the atlas doesn't have (anything outside ASCII) is
skipped entirely, which is the honest behaviour for a HUD font and the
reason all the HUD strings below are upper-case ASCII.

`bottom` is `pen.y − bearing.y` because the pen's y is the *baseline*, in
pixels from the top, and a positive bearing means "above the baseline",
which is *smaller* y on a screen. Text coordinates and screen coordinates
disagree about which way is up, and this line is where they're reconciled.

**`TextLayout.swift`**, in `TextLayout` — after `append`:

```diff
+    /// Pixels from the top-left to NDC.
+    static func toNDC(_ p: SIMD2<Float>, _ viewport: SIMD2<Float>) -> SIMD2<Float> {
+        SIMD2<Float>(p.x / viewport.x * 2 - 1, 1 - p.y / viewport.y * 2)
+    }
+
+    /// Two triangles. `min` is the bottom-left corner in NDC, `max` the top-right;
+    /// `uvMin` is the top-left of the glyph in the atlas, `uvMax` the bottom-right.
+    static func appendQuad(
+        _ out: inout [HUDVertex], min lo: SIMD2<Float>, max hi: SIMD2<Float>,
+        uvMin: SIMD2<Float>, uvMax: SIMD2<Float>, color: Vec4
+    ) {
+        let a = HUDVertex(position: SIMD2<Float>(lo.x, lo.y), uv: SIMD2<Float>(uvMin.x, uvMax.y), color: color)
+        let b = HUDVertex(position: SIMD2<Float>(hi.x, lo.y), uv: SIMD2<Float>(uvMax.x, uvMax.y), color: color)
+        let c = HUDVertex(position: SIMD2<Float>(hi.x, hi.y), uv: SIMD2<Float>(uvMax.x, uvMin.y), color: color)
+        let d = HUDVertex(position: SIMD2<Float>(lo.x, hi.y), uv: SIMD2<Float>(uvMin.x, uvMin.y), color: color)
+        out += [a, b, c, a, c, d]
+    }
```

`toNDC` is two lines and one of them flips y. `appendQuad` pairs the
*bottom* of the quad in NDC with the *bottom* of the glyph in the atlas —
`uvMax.y`, since v goes down — and the top with the top. Get one of those
pairings wrong and every character renders upside down, which is at least
easy to notice.

---

## A HUD with words

The HUD system has grown a parameter per chapter — stats, hull, wave,
breather, loadout, aspect, reticle, flight — and this chapter needs two
more and a swap. Time for a struct.

**`Sources/SpaceFighter/Systems/HUDSystem.swift`** — replace the whole file:

```swift
import simd

/// Presentation. What the flight debug overlay shows: every value is -1…1 or
/// 0…1 so the bars need no scale of their own.
struct FlightDebug {
    var stick: Vec3     // pitch, yaw, roll as asked
    var rate: Vec3      // angular velocity as a fraction of the max rate
    var throttle: Float
    var speed: Float    // as a fraction of boost speed
    var speedUnits: Float
}

/// Presentation. Screen positions (NDC) of where the nose points and where
/// the ship is actually travelling; nil when off screen or behind.
struct Reticle {
    var nose: SIMD2<Float>?
    var path: SIMD2<Float>?
}

/// Presentation. Everything the HUD draws from, gathered by `Game.frame`.
struct HUDInput {
    var stats: GameStats
    var run: RunStats
    var hull: Float          // 0…1
    var hullPoints: Float
    var wave: Int
    var breather: Bool
    var loadout: Loadout
    var viewport: SIMD2<Float>  // pixels
    var reticle = Reticle()
    var flight: FlightDebug?
}
```

`FlightDebug` and `Reticle` are chapters 04 and 05's, with one field added
to the first — the speed in units, for a number. `HUDInput` is the new
signature: everything `build` used to take, plus the viewport in pixels
(which replaces the aspect ratio, since the aspect is a division away) and
the hull in points as well as as a fraction.

**`HUDSystem.swift`** — after `HUDInput`:

```swift
/// Builds the HUD as textured triangles in normalised device coordinates.
/// A pure function: numbers in, vertices out.
enum HUDSystem {
    static let font = FontAtlas.standard

    static func build(_ hud: HUDInput) -> [HUDVertex] {
        var v: [HUDVertex] = []
        let vp = hud.viewport
        let aspect = vp.x / max(vp.y, 1)
        let white = Vec4(0.92, 0.95, 1.0, 0.95)
        let gold = Vec4(0.9, 0.85, 0.5, 0.95)

        // Top left: the wave. Top right: the score.
        text("WAVE \(hud.wave)", at: SIMD2(24, 44), size: 28, color: gold, into: &v, vp)
        text("\(hud.run.score)", at: SIMD2(vp.x - 24, 44), size: 28, color: white, align: .right, into: &v, vp)
        if hud.breather {
            text("WAVE \(hud.wave + 1) INCOMING", at: SIMD2(vp.x / 2, vp.y * 0.18), size: 34, color: gold,
                 align: .center, into: &v, vp)
        }

        if hud.stats.hitFlash > 0 {
            let a = 0.35 * min(hud.stats.hitFlash / 0.5, 1)
            appendRect(&v, cx: 0, cy: 0, hw: 1, hh: 1, color: Vec4(1, 0.1, 0.1, a))
        }
        if let toast = hud.stats.toast, hud.stats.toastTime > 0 {
            let a = min(hud.stats.toastTime / 0.4, 1)
            var color = toast.kind.color
            color.w = a
            text(toast.text, at: SIMD2(vp.x / 2, vp.y * 0.7), size: 26, color: color, align: .center, into: &v, vp)
        }
        return v
    }
}
```

The wave as a word, the score as a number right-aligned to the right edge,
the breather banner as a sentence. The toast is new: the name of the last
pickup, centred below the reticle, fading out over its last 0.4 s. `Toast`
lives on `GameStats` and is set from the `pickedUp` event — that's below, in
`Game`.

**`HUDSystem.swift`**, in `build` — replace `return v` with the rest of the
HUD:

```diff
-        return v
+
+        // Reticles.
+        let cyan = Vec4(0.4, 1.0, 0.9, 0.9)
+        if let nose = hud.reticle.nose {
+            appendRect(&v, cx: nose.x, cy: nose.y, hw: 0.035 / aspect, hh: 0.004, color: cyan)
+            appendRect(&v, cx: nose.x, cy: nose.y, hw: 0.004 / aspect, hh: 0.035, color: cyan)
+        }
+        if let path = hud.reticle.path {
+            let amber = Vec4(1.0, 0.8, 0.3, 0.9)
+            appendRect(&v, cx: path.x, cy: path.y - 0.018, hw: 0.018 / aspect, hh: 0.003, color: amber)
+            appendRect(&v, cx: path.x, cy: path.y + 0.018, hw: 0.018 / aspect, hh: 0.003, color: amber)
+            appendRect(&v, cx: path.x - 0.018 / aspect, cy: path.y, hw: 0.003 / aspect, hh: 0.018, color: amber)
+            appendRect(&v, cx: path.x + 0.018 / aspect, cy: path.y, hw: 0.003 / aspect, hh: 0.018, color: amber)
+        }
+        appendRect(&v, cx: 0, cy: 0, hw: 0.006 / aspect, hh: 0.006, color: Vec4(1, 1, 1, 0.5))
+
+        // Bottom left: hull bar with its number, shield pips, missile count.
+        let frac = hud.hull
+        let barX: Float = -0.72
+        let barY: Float = -0.9
+        let barHW: Float = 0.22
+        let barHH: Float = 0.02
+        appendRect(&v, cx: barX, cy: barY, hw: barHW, hh: barHH, color: Vec4(0.1, 0.1, 0.12, 0.7))
+        let fillHW = barHW * frac
+        let fillColor = Vec4(1 - frac, 0.2 + 0.7 * frac, 0.25, 0.95)
+        appendRect(&v, cx: barX - barHW + fillHW, cy: barY, hw: fillHW, hh: barHH, color: fillColor)
+        let barRightPx = (barX + barHW + 1) / 2 * vp.x
+        let barYPx = (1 - barY) / 2 * vp.y
+        text("\(Int(hud.hullPoints.rounded()))", at: SIMD2(barRightPx + 14, barYPx + 9), size: 24, color: white,
+             into: &v, vp)
+        for i in 0..<hud.loadout.shield {
+            let x = -0.94 + Float(i) * 0.04 / aspect
+            appendRect(&v, cx: x, cy: -0.82, hw: 0.014 / aspect, hh: 0.014, color: UpgradeKind.shield.color)
+        }
+        if hud.loadout.missiles > 0 {
+            let x = (-0.94 + 1) / 2 * vp.x
+            text("\(hud.loadout.missiles) MSL", at: SIMD2(x, (1 + 0.76) / 2 * vp.y), size: 20,
+                 color: UpgradeKind.missiles.color, into: &v, vp)
+        }
+
+        if let flight = hud.flight { appendFlightDebug(&v, flight, aspect: aspect, vp) }
+        return v
```

The reticles and the hull bar are the previous chapters' code unchanged. The
bar gets its number beside it, converted from the bar's NDC corner to pixels
so the two line up; the missile pips become a count. The wave tally marks
and the breather bar from chapter 07 are gone — words replaced them at the
top.

**`HUDSystem.swift`**, in `HUDSystem` — after `build`:

```diff
+    private static func text(
+        _ s: String, at p: SIMD2<Float>, size: Float, color: Vec4, align: TextAlign = .left,
+        into v: inout [HUDVertex], _ viewport: SIMD2<Float>
+    ) {
+        TextLayout.append(s, at: p, size: size, color: color, align: align, viewport: viewport, atlas: font, into: &v)
+    }
+
+    /// Bottom right: three pairs of bars (stick over rate) for pitch, yaw and
+    /// roll, then throttle and speed, with the speed as a number. A stick bar
+    /// that leads its rate bar is the angular inertia you're feeling.
+    private static func appendFlightDebug(
+        _ v: inout [HUDVertex], _ f: FlightDebug, aspect: Float, _ vp: SIMD2<Float>
+    ) {
+        let x: Float = 0.72
+        let hw: Float = 0.2
+        let hh: Float = 0.012
+        let rows: [(Float, Vec4)] = [
+            (f.stick.x, Vec4(0.9, 0.9, 0.9, 0.9)), (f.rate.x, Vec4(0.4, 0.8, 1.0, 0.9)),
+            (f.stick.y, Vec4(0.9, 0.9, 0.9, 0.9)), (f.rate.y, Vec4(0.4, 0.8, 1.0, 0.9)),
+            (f.stick.z, Vec4(0.9, 0.9, 0.9, 0.9)), (f.rate.z, Vec4(0.4, 0.8, 1.0, 0.9)),
+            (f.throttle * 2 - 1, Vec4(1.0, 0.8, 0.3, 0.9)), (f.speed * 2 - 1, Vec4(1.0, 0.5, 0.3, 0.9)),
+        ]
+        for (i, (value, color)) in rows.enumerated() {
+            let y: Float = -0.62 - Float(i) * 0.04
+            appendRect(&v, cx: x, cy: y, hw: hw, hh: hh, color: Vec4(0.1, 0.1, 0.12, 0.7))
+            let signed = max(-1, min(value, 1))
+            appendRect(&v, cx: x + hw * signed * 0.5, cy: y, hw: hw * abs(signed) * 0.5, hh: hh, color: color)
+            appendRect(&v, cx: x, cy: y, hw: 0.002 / aspect, hh: hh, color: Vec4(1, 1, 1, 0.5))
+        }
+        text("\(Int(f.speedUnits)) u/s", at: SIMD2((x - hw + 1) / 2 * vp.x, (1 + 0.58) / 2 * vp.y), size: 20,
+             color: Vec4(1, 0.5, 0.3, 0.9), into: &v, vp)
+    }
+
+    /// Append two triangles forming an axis-aligned rectangle, in NDC, solid.
+    static func appendRect(
+        _ out: inout [HUDVertex], cx: Float, cy: Float, hw: Float, hh: Float, color: Vec4
+    ) {
+        let uv = font.whiteUV
+        let a = SIMD2<Float>(cx - hw, cy - hh)
+        let b = SIMD2<Float>(cx + hw, cy - hh)
+        let c = SIMD2<Float>(cx + hw, cy + hh)
+        let d = SIMD2<Float>(cx - hw, cy + hh)
+
+        out.append(HUDVertex(position: a, uv: uv, color: color))
+        out.append(HUDVertex(position: b, uv: uv, color: color))
+        out.append(HUDVertex(position: c, uv: uv, color: color))
+        out.append(HUDVertex(position: a, uv: uv, color: color))
+        out.append(HUDVertex(position: c, uv: uv, color: color))
+        out.append(HUDVertex(position: d, uv: uv, color: color))
+    }
```

`appendRect` is the first guide's, with one line added — `let uv =
font.whiteUV` — and every vertex given it. That line is what lets the HUD
keep one pipeline. It's no longer `private`, because a test wants it.

Now the game gathers the input.

**`Sources/SpaceFighter/Game.swift`** — replace `GameStats`, and add `Toast`
after it:

```swift
final class GameStats {
    var hitFlash: Float = 0      // seconds of red flash remaining
    var pendingShake: Float = 0  // 0…1
    var toast: Toast?            // the last pickup, named
    var toastTime: Float = 0     // seconds left to show it
}

/// A short message the HUD shows for a moment.
struct Toast {
    var text: String
    var kind: UpgradeKind

    static func name(of kind: UpgradeKind) -> String {
        switch kind {
        case .rapidFire: return "RAPID FIRE"
        case .spread: return "SPREAD"
        case .damage: return "HEAVY BOLTS"
        case .missiles: return "+2 MISSILES"
        case .shield: return "SHIELD"
        }
    }
}
```

The doc comment above `GameStats` stays. `Toast.name` is upper-case ASCII
because that's what the atlas has.

**`Game.swift`** — replace the head of `frame` through
`effects.removeAll`:

```swift
    func frame(viewport: SIMD2<Float>, realDt: Float) -> FrameRenderData {
        let alpha = clock.alpha
        let aspect = viewport.x / max(viewport.y, 1)
        stats.hitFlash = max(0, stats.hitFlash - realDt)
        stats.toastTime = max(0, stats.toastTime - realDt)
        for event in effects {
            switch event {
            case .damaged(let e, _, _) where e == player:
                stats.hitFlash = 0.5
                stats.pendingShake = 1
            case .pickedUp(let e, let kind) where e == player:
                stats.toast = Toast(text: Toast.name(of: kind), kind: kind)
                stats.toastTime = 1.5
            default:
                break
            }
        }
        effects.removeAll(keepingCapacity: true)
```

`frame` takes the viewport in pixels now and derives the aspect itself. The
event loop that used to handle one event handles two, and chapter 08's
`pickedUp` finally has a consumer.

**`Game.swift`**, in `frame` — replace the `return FrameRenderData(…)` and
delete `hullFraction` after it:

```swift
        let health = world.get(Health.self, player)
        return FrameRenderData(
            frame: frame,
            instances: instances,
            focus: focus,
            hud: HUDSystem.build(HUDInput(
                stats: stats, run: run,
                hull: health.map { max(0, min($0.current / $0.max, 1)) } ?? 0,
                hullPoints: max(0, health?.current ?? 0),
                wave: director.wave, breather: director.phase == .breather,
                loadout: world.get(Loadout.self, player) ?? Loadout(),
                viewport: viewport,
                reticle: reticle(viewProjection: viewProjection, alpha: alpha),
                flight: flightDebug()))
        )
    }
```

**`Game.swift`**, in `flightDebug`:

```diff
             throttle: engine.throttle,
-            speed: engine.speed / model.boostSpeed)
+            speed: engine.speed / model.boostSpeed,
+            speedUnits: engine.speed)
```

**`Sources/SpaceFighter/GameView.swift`**, in `draw`:

```diff
         let size = view.drawableSize
-        let aspect = Float(size.width / max(size.height, 1))
+        let viewport = SIMD2<Float>(Float(max(size.width, 1)), Float(max(size.height, 1)))
```

```diff
-        let data = game.frame(aspect: aspect, realDt: dt)
+        let data = game.frame(viewport: viewport, realDt: dt)
```

`drawableSize` is in *pixels* — on a Retina display, twice the window's
points in each direction. That's the right unit for the HUD, because the
HUD's vertices end up in NDC over the drawable, and it means a 28-pixel
label is half as tall in points on a Retina Mac as on a non-Retina one. The
challenge is about that.

Two earlier tests call `frame` with an aspect:

**`Tests/SpaceFighterTests/Ch05CameraTests.swift`** and
**`Ch06CollisionTests.swift`** — everywhere:

```diff
-frame(aspect: 1.6, realDt:
+frame(viewport: SIMD2<Float>(1600, 1000), realDt:
```

(Five call sites in the camera tests, one in the collision tests. The
viewport keeps the same 1.6 aspect.)

And the boundary test learns the new directory:

**`Tests/SpaceFighterTests/BoundaryTests.swift`**, in
`gameplayNeverTouchesMetal`:

```diff
         "Sources/SpaceFighter/Archetypes",
         "Sources/SpaceFighter/Content/Meshes",
+        "Sources/SpaceFighter/Content/Fonts",
     ]
```

---

## The tests

**`Tests/SpaceFighterTests/Ch09TextTests.swift`** — new file:

```swift
import Testing
import simd

@testable import SpaceFighter

@Test func theAtlasHoldsEveryPrintableCharacterAndAWhiteBlock() {
    let atlas = FontAtlas.standard
    #expect(atlas.glyphs.count == 95)
    #expect(atlas.pixels.count == atlas.width * atlas.height)
    // The white block is solid where the UV says it is.
    let x = Int(atlas.whiteUV.x * Float(atlas.width))
    let y = Int((1 - atlas.whiteUV.y) * Float(atlas.height))
    #expect(atlas.pixels[y * atlas.width + x] == 255)
    // 'A' has ink inside its box, and none is lost outside it; ' ' has no box.
    let a = atlas.glyphs["A"]!
    let x0 = Int(a.uvMin.x * Float(atlas.width)), x1 = Int(a.uvMax.x * Float(atlas.width))
    let y0 = Int(a.uvMin.y * Float(atlas.height)), y1 = Int(a.uvMax.y * Float(atlas.height))
    var ink = 0
    for y in y0..<y1 { for x in x0..<x1 where atlas.pixels[y * atlas.width + x] > 128 { ink += 1 } }
    let box = Float((x1 - x0) * (y1 - y0))
    #expect(Float(ink) / box > 0.15 && Float(ink) / box < 0.6, "an A is mostly hole: \(Float(ink) / box)")
    #expect(atlas.glyphs[" "]!.size.x == 0)
    #expect(atlas.glyphs[" "]!.advance > 0)
}
```

This test found both bugs the atlas section named. With the array-closure
bug, `pixels` is all zeros and the white-block check fails. With the
white block drawn at Core Graphics' bottom, the pixel at `whiteUV` is zero
too. And the ink check — a letter A fills between fifteen and sixty percent
of its own box — catches a UV table that points at the wrong cell.

**`Ch09TextTests.swift`** — after the atlas test:

```swift
@Test func layoutWidthScalesWithSize() {
    let atlas = FontAtlas.standard
    let advance = atlas.glyphs["0"]!.advance
    let w48 = TextLayout.width(of: "0000", size: 48)
    let w24 = TextLayout.width(of: "0000", size: 24)
    #expect(abs(w48 - 4 * advance) < 1e-3)
    #expect(abs(w24 - 2 * advance) < 1e-3)
}

@Test func layoutProducesSixVerticesPerInkedGlyph() {
    var v: [HUDVertex] = []
    TextLayout.append("AB C", at: SIMD2(100, 100), size: 32, color: Vec4(1, 1, 1, 1),
                      viewport: SIMD2(800, 600), into: &v)
    #expect(v.count == 3 * 6, "the space has no quad")
    // Left-aligned text starts at the pen and runs right, in NDC.
    #expect(v[0].position.x > -0.8 && v[0].position.x < -0.7)
    #expect(v.last!.position.x > v[0].position.x)
}

@Test func solidShapesPointAtTheWhiteBlock() {
    var v: [HUDVertex] = []
    HUDSystem.appendRect(&v, cx: 0, cy: 0, hw: 0.1, hh: 0.1, color: Vec4(1, 1, 1, 1))
    #expect(v.count == 6)
    #expect(v.allSatisfy { $0.uv == FontAtlas.standard.whiteUV })
}

@Test func pixelsToNDCFlipsY() {
    let vp = SIMD2<Float>(800, 600)
    #expect(TextLayout.toNDC(SIMD2(0, 0), vp) == SIMD2(-1, 1))
    #expect(TextLayout.toNDC(SIMD2(800, 600), vp) == SIMD2(1, -1))
    #expect(TextLayout.toNDC(SIMD2(400, 300), vp) == SIMD2(0, 0))
}
```

---

## Checkpoint

```console
$ swift test
✔ Test run with 57 tests in 0 suites passed
```

**Fifty-seven tests.** Then run it, and read:

1. **`WAVE 1`** top left in gold, your score top right in white, and — two
   seconds in — **`WAVE 2 INCOMING`** across the top when the first wave is
   done. The tally marks and the bar are gone.
2. **A number beside the hull bar.** `100`, or `150` in the Bulwark. Get
   hit and it drops with the bar.
3. **Fly through a pickup**: its name flashes below the reticle in its
   colour — `SPREAD`, `RAPID FIRE` — and fades. Missiles read `2 MSL`.
4. **Press `` ` ``**: the flight bars have a speed readout in units per
   second beside them.
5. **Every rectangle is still there** — the reticles, the hull bar, the hit
   flash, the debug bars. If the text works and the rectangles have all
   vanished, or vice versa, read the failure modes.

**If nothing on the HUD is visible at all**, the atlas is blank — the
`CGContext` was built from a pointer that didn't outlive its closure, or the
texture isn't bound (`setFragmentTexture`). **If rectangles are gone but
text is fine**, the white block is at the bottom of the bitmap: check the
`y: height - cellHeight + 1` in `fill`. **If text is upside down**, the UV
pairing in `appendQuad` is inverted. **If letters are the right shape but
sit in the wrong cells** (an `A` that shows a `B`), the `cell % columns` /
`cell / columns` arithmetic disagrees with the loop that built the table.
**If the build fails on `frame(aspect:)`**, a test still passes an aspect.

---

## Challenge

Text is sized in *drawable* pixels, so on a Retina display everything on
the HUD is half the size it is on a non-Retina one. Fix it: multiply every
text size and pixel position by the view's backing scale factor
(`window.backingScaleFactor`, or `drawableSize / bounds.size`), so that
`28` means twenty-eight *points* everywhere. Three things to get right:
where the scale enters — `HUDInput` should carry it, and nothing in
`TextLayout` should know about it; the rectangles, which are already in NDC
and therefore already scale correctly, mustn't be scaled twice; and the
atlas, which is 48 pixels — at 2× a 34-point banner is 68 pixels and the
atlas is being *upsampled*. Decide whether that's acceptable, or whether the
atlas should be built at `48 × scale`.

---

**Next:** a title screen, a hangar, a pause, and the end of a run. →
[Chapter 10: Game states and menus](10-game-states-and-menus.md)

---

*Back to the [guide map](../README.md) · references in [`resources.md`](../resources.md)*
