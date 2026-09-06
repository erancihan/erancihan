#include <metal_stdlib>

struct Vertex        { float3 position; float3 normal; };
struct InstanceData  { float4x4 model; float4 color; };
struct FrameUniforms { float4x4 viewProjection; float3 cameraPosition; float3 lightDirection; };
struct HUDVertex     { float2 position; float4 color; };
struct StarParams    { float span; float pointSize; };
