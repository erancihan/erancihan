#pragma once

#include "Mesh.hpp"
#include "render/RenderTypes.hpp"
#include "render/Swapchain.hpp"
#include "render/VulkanContext.hpp"

#include <array>
#include <functional>
#include <string>
#include <unordered_map>
#include <vector>

constexpr int MAX_FRAMES_IN_FLIGHT = 2;
constexpr uint32_t kMaxInstances = 4096;
constexpr uint32_t kMaxHudVertices = 4096;

/// A VkBuffer plus the VMA allocation backing it. `mapped` is non-null only for
/// buffers we asked VMA to keep permanently mapped.
struct Buffer {
    VkBuffer buffer = VK_NULL_HANDLE;
    VmaAllocation alloc = VK_NULL_HANDLE;
    void* mapped = nullptr;
};

/// The GPU-side counterpart of MeshData. `indexCount == 0` means non-indexed.
struct Mesh {
    Buffer vertexBuffer;
    Buffer indexBuffer;
    uint32_t vertexCount = 0;
    uint32_t indexCount = 0;
};

struct FrameSync {
    VkSemaphore imageAvailable = VK_NULL_HANDLE;
    VkSemaphore renderFinished = VK_NULL_HANDLE;
    VkFence inFlight = VK_NULL_HANDLE;
};

/// One mesh's slice of the flattened instance array.
struct DrawGroup {
    MeshID mesh;
    uint32_t first;
    uint32_t count;
};

enum class DepthMode { TestWrite, TestOnly, Off };
enum class BlendMode { Opaque, Additive, Alpha };
enum class VertexLayout { Mesh, MeshPositionOnly, Hud };

class Renderer {
public:
    void init(VulkanContext& context, GLFWwindow* win, Swapchain& sc);
    void destroy();
    void drawFrame(const FrameData& frame);
    void onFramebufferResized() { framebufferResized = true; }

private:
    void createCommandResources();
    void createSyncObjects();
    void recordFrame(VkCommandBuffer cmd, uint32_t imageIndex);

    Buffer createBuffer(VkDeviceSize size, VkBufferUsageFlags usage,
                        VmaAllocationCreateFlags flags);
    void destroyBuffer(Buffer& b);
    void immediateSubmit(const std::function<void(VkCommandBuffer)>& record);
    Buffer uploadStatic(const void* data, VkDeviceSize size, VkBufferUsageFlags usage);
    void createPerFrameBuffers();
    void createDescriptors();

    VkShaderModule loadShader(const std::string& path);
    VkPipeline makePipeline(const char* vertPath, const char* fragPath,
                            VkPrimitiveTopology topology, DepthMode depthMode,
                            BlendMode blendMode, VertexLayout layout);
    void createPipelines();

    Mesh uploadMesh(const MeshData& data);
    void createMeshes();
    void uploadFrameData(const FrameData& frame);
    void drawMeshGroup(VkCommandBuffer cmd, const DrawGroup& group);

    VulkanContext* ctx = nullptr;
    GLFWwindow* window = nullptr;
    Swapchain* swapchain = nullptr;

    VkCommandPool commandPool = VK_NULL_HANDLE;
    std::array<VkCommandBuffer, MAX_FRAMES_IN_FLIGHT> commandBuffers{};
    std::array<FrameSync, MAX_FRAMES_IN_FLIGHT> sync{};

    std::array<Buffer, MAX_FRAMES_IN_FLIGHT> uniformBuffers{};
    std::array<Buffer, MAX_FRAMES_IN_FLIGHT> instanceBuffers{};
    std::array<Buffer, MAX_FRAMES_IN_FLIGHT> hudBuffers{};

    VkDescriptorSetLayout setLayout = VK_NULL_HANDLE;
    VkDescriptorPool descriptorPool = VK_NULL_HANDLE;
    std::array<VkDescriptorSet, MAX_FRAMES_IN_FLIGHT> descriptorSets{};

    VkPipelineLayout pipelineLayout = VK_NULL_HANDLE;
    VkPipeline litPipeline = VK_NULL_HANDLE;
    VkPipeline gridPipeline = VK_NULL_HANDLE;
    VkPipeline boltPipeline = VK_NULL_HANDLE;
    VkPipeline starPipeline = VK_NULL_HANDLE;
    VkPipeline hudPipeline = VK_NULL_HANDLE;

    std::unordered_map<MeshID, Mesh> meshes;

    std::vector<DrawGroup> groups;
    uint32_t gridInstance = 0;
    uint32_t hudVertexCount = 0;

    uint32_t currentFrame = 0;
    bool framebufferResized = false;
};
