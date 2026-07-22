import Foundation

/// The Metal Shading Language source for the whole game, compiled at runtime by
/// `device.makeLibrary(source:options:)`. Keeping the shaders in a string (rather
/// than a separate `.metal` file that SwiftPM would have to compile) makes the
/// package build with a plain `swift run` and keeps the GPU code next to the
/// Swift types it mirrors.
///
/// The `struct`s below must stay byte-for-byte compatible with the Swift structs
/// in `RenderTypes.swift`. Buffer indices are a fixed convention:
///   buffer(0) = vertices     buffer(1) = per-instance data
///   buffer(2) = frame uniforms   buffer(3) = extra params (star field)
enum Shaders {
    static let source = """
    #include <metal_stdlib>
    using namespace metal;

    struct Vertex        { float3 position; float3 normal; };
    struct InstanceData  { float4x4 model; float4 color; };
    struct FrameUniforms { float4x4 viewProjection; float3 cameraPosition; float3 lightDirection; };
    struct HUDVertex     { float2 position; float4 color; };
    struct StarParams    { float span; float pointSize; };

    struct LitInOut   { float4 position [[position]]; float3 worldNormal; float4 color; };
    struct FlatInOut  { float4 position [[position]]; float4 color; };
    struct PointInOut { float4 position [[position]]; float4 color; float pointSize [[point_size]]; };
    struct HUDInOut   { float4 position [[position]]; float4 color; };

    // --- Lit: ship + enemies, simple directional (Lambert) shading ---------

    vertex LitInOut lit_vertex(uint vid              [[vertex_id]],
                               uint iid              [[instance_id]],
                               constant Vertex*       verts     [[buffer(0)]],
                               constant InstanceData* instances [[buffer(1)]],
                               constant FrameUniforms& frame    [[buffer(2)]]) {
        Vertex v = verts[vid];
        InstanceData inst = instances[iid];
        float4 world = inst.model * float4(v.position, 1.0);
        // Uniform scale only, so the model's upper-left 3x3 is a valid normal
        // matrix — no inverse-transpose needed.
        float3x3 nm = float3x3(inst.model[0].xyz, inst.model[1].xyz, inst.model[2].xyz);
        LitInOut out;
        out.position    = frame.viewProjection * world;
        out.worldNormal = normalize(nm * v.normal);
        out.color       = inst.color;
        return out;
    }

    fragment float4 lit_fragment(LitInOut in [[stage_in]],
                                 constant FrameUniforms& frame [[buffer(0)]]) {
        float3 N = normalize(in.worldNormal);
        float3 L = normalize(-frame.lightDirection);   // toward the light
        float  diffuse = max(dot(N, L), 0.0);
        float  ambient = 0.25;
        float3 lit = in.color.rgb * (ambient + diffuse * 0.85);
        return float4(lit, in.color.a);
    }

    // --- Unlit: grid lines + glowing bolts, flat instance colour -----------

    vertex FlatInOut unlit_vertex(uint vid              [[vertex_id]],
                                  uint iid              [[instance_id]],
                                  constant Vertex*       verts     [[buffer(0)]],
                                  constant InstanceData* instances [[buffer(1)]],
                                  constant FrameUniforms& frame    [[buffer(2)]]) {
        Vertex v = verts[vid];
        InstanceData inst = instances[iid];
        FlatInOut out;
        out.position = frame.viewProjection * (inst.model * float4(v.position, 1.0));
        out.color    = inst.color;
        return out;
    }

    fragment float4 unlit_fragment(FlatInOut in [[stage_in]]) {
        return in.color;
    }

    // --- Starfield: points wrapped into a cube centred on the camera -------

    vertex PointInOut star_vertex(uint vid              [[vertex_id]],
                                  uint iid              [[instance_id]],
                                  constant Vertex*       verts     [[buffer(0)]],
                                  constant InstanceData* instances [[buffer(1)]],
                                  constant FrameUniforms& frame    [[buffer(2)]],
                                  constant StarParams&   params    [[buffer(3)]]) {
        Vertex v = verts[vid];
        // Tile the star cube endlessly around the camera: shift each star into
        // the [-span/2, span/2] box relative to the camera.
        float3 rel = v.position - frame.cameraPosition;
        rel = rel - round(rel / params.span) * params.span;
        float3 world = frame.cameraPosition + rel;

        PointInOut out;
        out.position  = frame.viewProjection * float4(world, 1.0);
        out.pointSize = params.pointSize;
        // normal.x carries a per-star brightness (see MeshLibrary.starfield).
        out.color     = float4(instances[iid].color.rgb * v.normal.x, 1.0);
        return out;
    }

    fragment float4 star_fragment(PointInOut in [[stage_in]],
                                  float2 pc [[point_coord]]) {
        float d = distance(pc, float2(0.5));
        if (d > 0.5) discard_fragment();          // round the square point
        float glow = 1.0 - smoothstep(0.0, 0.5, d);
        return float4(in.color.rgb, glow);
    }

    // --- HUD: 2D shapes straight in normalised device coordinates ----------

    vertex HUDInOut hud_vertex(uint vid [[vertex_id]],
                               constant HUDVertex* verts [[buffer(0)]]) {
        HUDInOut out;
        out.position = float4(verts[vid].position, 0.0, 1.0);
        out.color    = verts[vid].color;
        return out;
    }

    fragment float4 hud_fragment(HUDInOut in [[stage_in]]) {
        return in.color;
    }
    """
}
