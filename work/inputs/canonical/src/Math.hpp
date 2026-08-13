#pragma once

#define GLM_FORCE_RADIANS
#define GLM_FORCE_DEPTH_ZERO_TO_ONE

#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/quaternion.hpp>

namespace Math {

inline glm::mat4 trs(const glm::vec3& t, const glm::quat& r, const glm::vec3& s) {
    return glm::translate(glm::mat4(1.0f), t)
         * glm::mat4_cast(r)
         * glm::scale(glm::mat4(1.0f), s);
}

/// Right-handed, [0,1] depth, with the Y axis flipped for Vulkan's downward NDC.
inline glm::mat4 perspective(float fovyRadians, float aspect, float nearZ, float farZ) {
    glm::mat4 p = glm::perspectiveRH_ZO(fovyRadians, aspect, nearZ, farZ);
    p[1][1] *= -1.0f;
    return p;
}

inline glm::mat4 lookAt(const glm::vec3& eye, const glm::vec3& center, const glm::vec3& up) {
    return glm::lookAtRH(eye, center, up);
}

inline glm::vec3 forward(const glm::quat& q) { return glm::normalize(q * glm::vec3(0.0f, 0.0f, -1.0f)); }
inline glm::vec3 up(const glm::quat& q)      { return glm::normalize(q * glm::vec3(0.0f, 1.0f,  0.0f)); }
inline glm::vec3 right(const glm::quat& q)   { return glm::normalize(q * glm::vec3(1.0f, 0.0f,  0.0f)); }

} // namespace Math
