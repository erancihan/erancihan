#include <metal_stdlib>
#include "ShaderTypes.metal"
using namespace metal;

struct LitInOut { float4 position [[position]]; float3 worldNormal; float4 color; };

vertex LitInOut lit_vertex(
        uint vid                    [[vertex_id]],
        uint iid                    [[instance_id]],
        constant Vertex*        verts     [[buffer(0)]],
        constant InstanceData*  instances [[buffer(1)]],
        constant FrameUniforms& frame     [[buffer(2)]]
    ) 
{
    Vertex v = verts[vid];
    InstanceData inst = instances[iid];
    float4 world = inst.model * float4(v.position, 1.0);
    float3x3 nm = float3x3(inst.model[0].xyz, inst.model[1].xyz, inst.model[2].xyz);
    LitInOut out;
    out.position    = frame.viewProjection * world;
    out.worldNormal = normalize(nm * v.normal);
    out.color       = inst.color;
    return out;
}

fragment float4 lit_fragment(
        LitInOut in [[stage_in]],
        constant FrameUniforms& frame [[buffer(0)]]
    ) 
{
    float3 N = normalize(in.worldNormal);
    float3 L = normalize(-frame.lightDirection);   // toward the light
    float  diffuse = max(dot(N, L), 0.0);
    float  ambient = 0.25;
    float3 lit = in.color.rgb * (ambient + diffuse * 0.85);

    return float4(lit, in.color.a);
}
