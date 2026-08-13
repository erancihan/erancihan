#include "Game.hpp"
#include "Input.hpp"
#include "render/Renderer.hpp"
#include "render/Swapchain.hpp"
#include "render/VulkanContext.hpp"

#include <algorithm>
#include <cstdio>
#include <exception>
#include <string>

namespace {

constexpr int kInitialWidth = 1280;
constexpr int kInitialHeight = 720;
constexpr double kTitleInterval = 0.25;

void framebufferResizeCallback(GLFWwindow* window, int, int) {
    if (auto* renderer = static_cast<Renderer*>(glfwGetWindowUserPointer(window)))
        renderer->onFramebufferResized();
}

} // namespace

int main() {
    if (!glfwInit()) {
        std::fprintf(stderr, "glfwInit failed\n");
        return 1;
    }

    // Vulkan supplies its own surface; GLFW must not create an OpenGL context.
    glfwWindowHint(GLFW_CLIENT_API, GLFW_NO_API);
    GLFWwindow* window =
        glfwCreateWindow(kInitialWidth, kInitialHeight, "Space Fighter", nullptr, nullptr);
    if (!window) {
        std::fprintf(stderr, "failed to create a window\n");
        glfwTerminate();
        return 1;
    }

    VulkanContext ctx;
    Swapchain swapchain;
    Renderer renderer;

    try {
        ctx.init(window);
        swapchain.create(ctx, window);
        renderer.init(ctx, window, swapchain);
    } catch (const std::exception& e) {
        std::fprintf(stderr, "startup failed: %s\n", e.what());
        glfwDestroyWindow(window);
        glfwTerminate();
        return 1;
    }

    std::printf("[swapchain] %ux%u  format %d  %zu images\n", swapchain.extent.width,
                swapchain.extent.height, int(swapchain.colorFormat), swapchain.images.size());

    glfwSetWindowUserPointer(window, &renderer);
    glfwSetFramebufferSizeCallback(window, framebufferResizeCallback);

    Game game;
    Input input(window);

    double lastTime = glfwGetTime();
    double titleTimer = 0.0;

    while (!glfwWindowShouldClose(window)) {
        glfwPollEvents();
        if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS)
            glfwSetWindowShouldClose(window, GLFW_TRUE);

        double now = glfwGetTime();
        float dt = float(now - lastTime);
        lastTime = now;

        int w = 0, h = 0;
        glfwGetFramebufferSize(window, &w, &h);
        if (w == 0 || h == 0) continue;   // minimised: nothing to draw into
        float aspect = float(w) / float(std::max(h, 1));

        FrameData frame = game.update(dt, input.state(), aspect);
        renderer.drawFrame(frame);

        titleTimer += dt;
        if (titleTimer >= kTitleInterval) {
            titleTimer = 0.0;
            const GameStats& s = game.stats();
            std::string title = "Space Fighter    score " + std::to_string(s.score) +
                                "    hull " + std::to_string(int(s.playerHealth)) + "%" +
                                "    deaths " + std::to_string(s.deaths);
            glfwSetWindowTitle(window, title.c_str());
        }
    }

    renderer.destroy();
    swapchain.destroy(ctx);
    ctx.destroy();

    glfwDestroyWindow(window);
    glfwTerminate();
    return 0;
}
