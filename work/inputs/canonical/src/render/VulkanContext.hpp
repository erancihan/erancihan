#pragma once

#include <vulkan/vulkan.h>

#include <GLFW/glfw3.h>

#include "vk_mem_alloc.h"

#include <cstdint>
#include <optional>

#ifdef NDEBUG
constexpr bool kEnableValidation = false;
#else
constexpr bool kEnableValidation = true;
#endif

/// Aborts with the failing call's name. Vulkan returns codes rather than
/// throwing, and an unchecked VkResult is how a bug becomes a black screen.
void vkCheck(VkResult result, const char* what);

struct QueueFamilies {
    std::optional<uint32_t> graphics;
    std::optional<uint32_t> present;
    bool ok() const { return graphics.has_value() && present.has_value(); }
};

QueueFamilies findQueueFamilies(VkPhysicalDevice dev, VkSurfaceKHR surface);

/// The once-only Vulkan objects: everything created at startup and destroyed at
/// exit, with no per-frame state.
class VulkanContext {
public:
    void init(GLFWwindow* w);
    void destroy();

    VkInstance instance = VK_NULL_HANDLE;
    VkDebugUtilsMessengerEXT debugMessenger = VK_NULL_HANDLE;
    VkSurfaceKHR surface = VK_NULL_HANDLE;
    VkPhysicalDevice physical = VK_NULL_HANDLE;
    VkPhysicalDeviceProperties properties{};
    VkDevice device = VK_NULL_HANDLE;
    VkQueue graphicsQueue = VK_NULL_HANDLE;
    VkQueue presentQueue = VK_NULL_HANDLE;
    QueueFamilies families;
    VmaAllocator allocator = VK_NULL_HANDLE;

private:
    void createInstance();
    void createDebugMessenger();
    void pickPhysicalDevice();
    void createLogicalDevice();
    void createAllocator();

    GLFWwindow* window = nullptr;
};
