#include "render/Swapchain.hpp"

#include <algorithm>
#include <array>
#include <cstdint>
#include <limits>

namespace {

VkSurfaceFormatKHR chooseFormat(const std::vector<VkSurfaceFormatKHR>& available) {
    for (const VkSurfaceFormatKHR& f : available)
        if (f.format == VK_FORMAT_B8G8R8A8_SRGB &&
            f.colorSpace == VK_COLOR_SPACE_SRGB_NONLINEAR_KHR)
            return f;
    return available[0];
}

VkPresentModeKHR choosePresentMode(const std::vector<VkPresentModeKHR>&) {
    return VK_PRESENT_MODE_FIFO_KHR;   // always supported; this is vsync
}

VkExtent2D chooseExtent(const VkSurfaceCapabilitiesKHR& caps, GLFWwindow* window) {
    if (caps.currentExtent.width != std::numeric_limits<uint32_t>::max())
        return caps.currentExtent;

    int w = 0, h = 0;
    glfwGetFramebufferSize(window, &w, &h);
    VkExtent2D actual{uint32_t(w), uint32_t(h)};
    actual.width = std::clamp(actual.width, caps.minImageExtent.width, caps.maxImageExtent.width);
    actual.height = std::clamp(actual.height, caps.minImageExtent.height, caps.maxImageExtent.height);
    return actual;
}

} // namespace

void Swapchain::create(VulkanContext& ctx, GLFWwindow* window) {
    createSwapchain(ctx, window);
    createImageViews(ctx);
    createDepthResources(ctx);
    createRenderPass(ctx);
    createFramebuffers(ctx);
}

void Swapchain::createSwapchain(VulkanContext& ctx, GLFWwindow* window) {
    VkSurfaceCapabilitiesKHR caps{};
    vkGetPhysicalDeviceSurfaceCapabilitiesKHR(ctx.physical, ctx.surface, &caps);

    uint32_t formatCount = 0;
    vkGetPhysicalDeviceSurfaceFormatsKHR(ctx.physical, ctx.surface, &formatCount, nullptr);
    std::vector<VkSurfaceFormatKHR> formats(formatCount);
    vkGetPhysicalDeviceSurfaceFormatsKHR(ctx.physical, ctx.surface, &formatCount, formats.data());

    uint32_t modeCount = 0;
    vkGetPhysicalDeviceSurfacePresentModesKHR(ctx.physical, ctx.surface, &modeCount, nullptr);
    std::vector<VkPresentModeKHR> modes(modeCount);
    vkGetPhysicalDeviceSurfacePresentModesKHR(ctx.physical, ctx.surface, &modeCount, modes.data());

    VkSurfaceFormatKHR format = chooseFormat(formats);
    colorFormat = format.format;
    extent = chooseExtent(caps, window);

    // One more than the minimum so we are never blocked waiting on the
    // presenter for a free image.
    uint32_t imageCount = caps.minImageCount + 1;
    if (caps.maxImageCount > 0) imageCount = std::min(imageCount, caps.maxImageCount);

    VkSwapchainCreateInfoKHR ci{};
    ci.sType = VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR;
    ci.surface = ctx.surface;
    ci.minImageCount = imageCount;
    ci.imageFormat = format.format;
    ci.imageColorSpace = format.colorSpace;
    ci.imageExtent = extent;
    ci.imageArrayLayers = 1;
    ci.imageUsage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT;
    ci.preTransform = caps.currentTransform;
    ci.compositeAlpha = VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR;
    ci.presentMode = choosePresentMode(modes);
    ci.clipped = VK_TRUE;

    uint32_t indices[] = {*ctx.families.graphics, *ctx.families.present};
    if (indices[0] != indices[1]) {
        ci.imageSharingMode = VK_SHARING_MODE_CONCURRENT;
        ci.queueFamilyIndexCount = 2;
        ci.pQueueFamilyIndices = indices;
    } else {
        ci.imageSharingMode = VK_SHARING_MODE_EXCLUSIVE;
    }

    vkCheck(vkCreateSwapchainKHR(ctx.device, &ci, nullptr, &handle), "vkCreateSwapchainKHR");

    // The swapchain owns these images; we only retrieve handles to them.
    vkGetSwapchainImagesKHR(ctx.device, handle, &imageCount, nullptr);
    images.resize(imageCount);
    vkGetSwapchainImagesKHR(ctx.device, handle, &imageCount, images.data());
}

void Swapchain::createImageViews(VulkanContext& ctx) {
    views.resize(images.size());
    for (size_t i = 0; i < images.size(); i++) {
        VkImageViewCreateInfo v{};
        v.sType = VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO;
        v.image = images[i];
        v.viewType = VK_IMAGE_VIEW_TYPE_2D;
        v.format = colorFormat;
        v.subresourceRange = {VK_IMAGE_ASPECT_COLOR_BIT, 0, 1, 0, 1};
        vkCheck(vkCreateImageView(ctx.device, &v, nullptr, &views[i]), "vkCreateImageView");
    }
}

void Swapchain::createDepthResources(VulkanContext& ctx) {
    VkImageCreateInfo ii{};
    ii.sType = VK_STRUCTURE_TYPE_IMAGE_CREATE_INFO;
    ii.imageType = VK_IMAGE_TYPE_2D;
    ii.format = kDepthFormat;
    ii.extent = {extent.width, extent.height, 1};
    ii.mipLevels = 1;
    ii.arrayLayers = 1;
    ii.samples = VK_SAMPLE_COUNT_1_BIT;
    ii.tiling = VK_IMAGE_TILING_OPTIMAL;
    ii.usage = VK_IMAGE_USAGE_DEPTH_STENCIL_ATTACHMENT_BIT;
    ii.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED;

    VmaAllocationCreateInfo ai{};
    ai.usage = VMA_MEMORY_USAGE_AUTO;
    ai.flags = VMA_ALLOCATION_CREATE_DEDICATED_MEMORY_BIT;
    vkCheck(vmaCreateImage(ctx.allocator, &ii, &ai, &depthImage, &depthAlloc, nullptr),
            "vmaCreateImage");

    VkImageViewCreateInfo v{};
    v.sType = VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO;
    v.image = depthImage;
    v.viewType = VK_IMAGE_VIEW_TYPE_2D;
    v.format = kDepthFormat;
    v.subresourceRange = {VK_IMAGE_ASPECT_DEPTH_BIT, 0, 1, 0, 1};
    vkCheck(vkCreateImageView(ctx.device, &v, nullptr, &depthView), "vkCreateImageView(depth)");
}

void Swapchain::createRenderPass(VulkanContext& ctx) {
    VkAttachmentDescription color{};
    color.format = colorFormat;
    color.samples = VK_SAMPLE_COUNT_1_BIT;
    color.loadOp = VK_ATTACHMENT_LOAD_OP_CLEAR;
    color.storeOp = VK_ATTACHMENT_STORE_OP_STORE;
    color.stencilLoadOp = VK_ATTACHMENT_LOAD_OP_DONT_CARE;
    color.stencilStoreOp = VK_ATTACHMENT_STORE_OP_DONT_CARE;
    color.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED;
    color.finalLayout = VK_IMAGE_LAYOUT_PRESENT_SRC_KHR;

    VkAttachmentDescription depth{};
    depth.format = kDepthFormat;
    depth.samples = VK_SAMPLE_COUNT_1_BIT;
    depth.loadOp = VK_ATTACHMENT_LOAD_OP_CLEAR;
    depth.storeOp = VK_ATTACHMENT_STORE_OP_DONT_CARE;
    depth.stencilLoadOp = VK_ATTACHMENT_LOAD_OP_DONT_CARE;
    depth.stencilStoreOp = VK_ATTACHMENT_STORE_OP_DONT_CARE;
    depth.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED;
    depth.finalLayout = VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL;

    VkAttachmentReference colorRef{0, VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL};
    VkAttachmentReference depthRef{1, VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL};

    VkSubpassDescription subpass{};
    subpass.pipelineBindPoint = VK_PIPELINE_BIND_POINT_GRAPHICS;
    subpass.colorAttachmentCount = 1;
    subpass.pColorAttachments = &colorRef;
    subpass.pDepthStencilAttachment = &depthRef;

    // Hold the pass at the point of first write until the image is acquired.
    VkSubpassDependency dep{};
    dep.srcSubpass = VK_SUBPASS_EXTERNAL;
    dep.dstSubpass = 0;
    dep.srcStageMask = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT
                     | VK_PIPELINE_STAGE_EARLY_FRAGMENT_TESTS_BIT;
    dep.srcAccessMask = 0;
    dep.dstStageMask = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT
                     | VK_PIPELINE_STAGE_EARLY_FRAGMENT_TESTS_BIT;
    dep.dstAccessMask = VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT
                      | VK_ACCESS_DEPTH_STENCIL_ATTACHMENT_WRITE_BIT;

    std::array<VkAttachmentDescription, 2> attachments{color, depth};
    VkRenderPassCreateInfo rp{};
    rp.sType = VK_STRUCTURE_TYPE_RENDER_PASS_CREATE_INFO;
    rp.attachmentCount = uint32_t(attachments.size());
    rp.pAttachments = attachments.data();
    rp.subpassCount = 1;
    rp.pSubpasses = &subpass;
    rp.dependencyCount = 1;
    rp.pDependencies = &dep;

    vkCheck(vkCreateRenderPass(ctx.device, &rp, nullptr, &renderPass), "vkCreateRenderPass");
}

void Swapchain::createFramebuffers(VulkanContext& ctx) {
    framebuffers.resize(views.size());
    for (size_t i = 0; i < views.size(); i++) {
        VkImageView attachments[] = {views[i], depthView};

        VkFramebufferCreateInfo fb{};
        fb.sType = VK_STRUCTURE_TYPE_FRAMEBUFFER_CREATE_INFO;
        fb.renderPass = renderPass;
        fb.attachmentCount = 2;
        fb.pAttachments = attachments;
        fb.width = extent.width;
        fb.height = extent.height;
        fb.layers = 1;
        vkCheck(vkCreateFramebuffer(ctx.device, &fb, nullptr, &framebuffers[i]),
                "vkCreateFramebuffer");
    }
}

void Swapchain::destroySizeDependent(VulkanContext& ctx) {
    for (VkFramebuffer f : framebuffers) vkDestroyFramebuffer(ctx.device, f, nullptr);
    framebuffers.clear();

    if (depthView) vkDestroyImageView(ctx.device, depthView, nullptr);
    if (depthImage) vmaDestroyImage(ctx.allocator, depthImage, depthAlloc);
    depthView = VK_NULL_HANDLE;
    depthImage = VK_NULL_HANDLE;
    depthAlloc = VK_NULL_HANDLE;

    for (VkImageView v : views) vkDestroyImageView(ctx.device, v, nullptr);
    views.clear();

    if (handle) vkDestroySwapchainKHR(ctx.device, handle, nullptr);
    handle = VK_NULL_HANDLE;
}

void Swapchain::recreate(VulkanContext& ctx, GLFWwindow* window) {
    // A minimised window has a zero-sized framebuffer, which no swapchain can
    // match. Idle here until it comes back.
    int w = 0, h = 0;
    glfwGetFramebufferSize(window, &w, &h);
    while (w == 0 || h == 0) {
        glfwGetFramebufferSize(window, &w, &h);
        glfwWaitEvents();
    }

    vkDeviceWaitIdle(ctx.device);
    destroySizeDependent(ctx);

    createSwapchain(ctx, window);
    createImageViews(ctx);
    createDepthResources(ctx);
    createFramebuffers(ctx);   // the render pass does not depend on the extent
}

void Swapchain::destroy(VulkanContext& ctx) {
    destroySizeDependent(ctx);
    if (renderPass) vkDestroyRenderPass(ctx.device, renderPass, nullptr);
    renderPass = VK_NULL_HANDLE;
}
