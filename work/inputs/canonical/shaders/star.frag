#version 450

layout(location = 0) in float vBrightness;
layout(location = 0) out vec4 outColor;

void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    if (d > 0.5) discard;
    float falloff = smoothstep(0.5, 0.1, d);
    outColor = vec4(vec3(vBrightness) * falloff, 1.0);
}
