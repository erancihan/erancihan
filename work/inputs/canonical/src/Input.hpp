#pragma once

#include <GLFW/glfw3.h>

/// Intent, not keys. Axes are normalised to [-1, 1] so a gamepad stick can
/// replace the keyboard without any gameplay code changing.
struct InputState {
    float pitch = 0.0f;
    float yaw = 0.0f;
    float roll = 0.0f;
    float throttle = 0.0f;
    bool firing = false;
    bool boosting = false;
};

class Input {
public:
    explicit Input(GLFWwindow* w) : window(w) {}

    InputState state() const {
        InputState s;
        auto held = [&](int key) { return glfwGetKey(window, key) == GLFW_PRESS; };

        if (held(GLFW_KEY_A) || held(GLFW_KEY_LEFT)) s.yaw += 1.0f;
        if (held(GLFW_KEY_D) || held(GLFW_KEY_RIGHT)) s.yaw -= 1.0f;
        if (held(GLFW_KEY_W) || held(GLFW_KEY_UP)) s.pitch -= 1.0f;
        if (held(GLFW_KEY_S) || held(GLFW_KEY_DOWN)) s.pitch += 1.0f;
        if (held(GLFW_KEY_Q)) s.roll += 1.0f;
        if (held(GLFW_KEY_E)) s.roll -= 1.0f;

        s.firing = held(GLFW_KEY_SPACE);
        s.boosting = held(GLFW_KEY_LEFT_SHIFT);
        return s;
    }

private:
    GLFWwindow* window;
};
