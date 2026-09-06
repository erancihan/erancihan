#include <metal_stdlib>
#include "ShaderTypes.metal"
using namespace metal;

struct HUDInOut { float4 position [[position]]; float4 color; };

vertex HUDInOut hud_vertex(
        uint vid [[vertex_id]],
        constant HUDVertex* verts [[buffer(0)]]
    )    
{
    HUDInOut out;
    out.position = float4(verts[vid].position, 0.0, 1.0);
    out.color    = verts[vid].color;
    return out;
}

fragment float4 hud_fragment(HUDInOut in [[stage_in]]) {
    return in.color;
}
