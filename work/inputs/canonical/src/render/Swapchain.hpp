#pragma once

#include "render/VulkanContext.hpp"

#include <vector>

constexpr VkFormat kDepthFormat = VK_FORMAT_D32_SFLOAT;

/// Everything that depends on the window's size: the ring of images we present,
/// the shared depth buffer, and the render pass and framebuffers that address
/// them. Rebuilt wholesale when the window resizes.
class Swapchain {
public:
    void create(VulkanContext& ctx, GLFWwindow* window);
    void recreate(VulkanContext& ctx, GLFWwindow* window);
    void destroy(VulkanContext& ctx);

    VkSwapchainKHR handle = VK_NULL_HANDLE;
    VkFormat colorFormat = VK_FORMAT_UNDEFINED;
    VkExtent2D extent{};
    std::vector<VkImage> images;
    std::vector<VkImageView> views;

    VkImage depthImage = VK_NULL_HANDLE;
    VmaAllocation depthAlloc = VK_NULL_HANDLE;
    VkImageView depthView = VK_NULL_HANDLE;

    VkRenderPass renderPass = VK_NULL_HANDLE;
    std::vector<VkFramebuffer> framebuffers;

private:
    void createSwapchain(VulkanContext& ctx, GLFWwindow* window);
    void createImageViews(VulkanContext& ctx);
    void createDepthResources(VulkanContext& ctx);
    void createRenderPass(VulkanContext& ctx);
    void createFramebuffers(VulkanContext& ctx);
    void destroySizeDependent(VulkanContext& ctx);
};
