#version 450

layout(location = 0) in vec3 vNormal;
layout(location = 1) in vec4 vColor;

layout(set = 0, binding = 0) uniform FrameUniforms {
    mat4 viewProjection;
    vec4 cameraPosition;
    vec4 lightDirection;
} frame;

layout(location = 0) out vec4 outColor;

void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(-frame.lightDirection.xyz);
    float diffuse = max(dot(N, L), 0.0);
    outColor = vec4(vColor.rgb * (0.25 + diffuse * 0.85), vColor.a);
}
