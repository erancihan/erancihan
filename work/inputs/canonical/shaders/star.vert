#version 450

layout(location = 0) in vec3 inPosition;
layout(location = 1) in vec3 inNormal;

layout(set = 0, binding = 0) uniform FrameUniforms {
    mat4 viewProjection;
    vec4 cameraPosition;
    vec4 lightDirection;
} frame;

layout(push_constant) uniform StarParams {
    float span;
} params;

layout(location = 0) out float vBrightness;

void main() {
    vec3 rel = inPosition - frame.cameraPosition.xyz;
    rel = rel - round(rel / params.span) * params.span;
    vec3 world = frame.cameraPosition.xyz + rel;

    gl_Position = frame.viewProjection * vec4(world, 1.0);
    gl_PointSize = 2.0;
    vBrightness = inNormal.x;
}
