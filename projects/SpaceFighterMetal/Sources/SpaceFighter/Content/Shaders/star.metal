#include <metal_stdlib>
#include "ShaderTypes.metal"
using namespace metal;

struct PointInOut { float4 position [[position]]; float4 color; float pointSize [[point_size]]; };

vertex PointInOut star_vertex(
        uint vid                    [[vertex_id]],
        uint iid                    [[instance_id]],
        constant Vertex*        verts     [[buffer(0)]],
        constant InstanceData*  instances [[buffer(1)]],
        constant FrameUniforms& frame     [[buffer(2)]],
        constant StarParams&    params    [[buffer(3)]]
    ) 
{
    Vertex v = verts[vid];
    float3 rel = v.position - frame.cameraPosition;
    rel = rel - round(rel / params.span) * params.span;
    float3 world = frame.cameraPosition + rel;

    PointInOut out;
    out.position  = frame.viewProjection * float4(world, 1.0);
    out.pointSize = params.pointSize;
    out.color     = float4(instances[iid].color.rgb * v.normal.x, 1.0);
    return out;
}

fragment float4 star_fragment(
        PointInOut in [[stage_in]],
        float2 pc [[point_coord]]
    )
{
    float d = distance(pc, float2(0.5));
    if (d > 0.5) discard_fragment();
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    return float4(in.color.rgb, glow);
}
