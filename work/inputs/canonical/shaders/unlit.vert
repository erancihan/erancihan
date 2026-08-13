#version 450

layout(location = 0) in vec3 inPosition;

struct InstanceData {
    mat4 model;
    vec4 color;
};

layout(set = 0, binding = 0) uniform FrameUniforms {
    mat4 viewProjection;
    vec4 cameraPosition;
    vec4 lightDirection;
} frame;

layout(set = 0, binding = 1, std430) readonly buffer Instances {
    InstanceData instances[];
};

layout(location = 0) out vec4 vColor;

void main() {
    InstanceData inst = instances[gl_InstanceIndex];
    gl_Position = frame.viewProjection * inst.model * vec4(inPosition, 1.0);
    vColor = inst.color;
}
