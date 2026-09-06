#include <metal_stdlib>
#include "ShaderTypes.metal"
using namespace metal;

struct FlatInOut { float4 position [[position]]; float4 color; };

vertex FlatInOut unlit_vertex(
        uint vid                    [[vertex_id]],
        uint iid                    [[instance_id]],
        constant Vertex*        verts     [[buffer(0)]],
        constant InstanceData*  instances [[buffer(1)]],
        constant FrameUniforms& frame     [[buffer(2)]]
    ) 
{
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
