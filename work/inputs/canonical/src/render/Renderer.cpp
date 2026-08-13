#include "render/Renderer.hpp"

#include <algorithm>
#include <cstring>
#include <fstream>
#include <stdexcept>

namespace {

std::vector<char> readFile(const std::string& path) {
    std::ifstream file(path, std::ios::ate | std::ios::binary);
    if (!file) throw std::runtime_error("cannot open " + path +
                                        " (are you running from the build directory?)");
    size_t size = size_t(file.tellg());
    std::vector<char> buffer(size);
    file.seekg(0);
    file.read(buffer.data(), std::streamsize(size));
    return buffer;
}

} // namespace

void Renderer::init(VulkanContext& context, GLFWwindow* win, Swapchain& sc) {
    ctx = &context;
    window = win;
    swapchain = &sc;

    createCommandResources();
    createSyncObjects();
    createPerFrameBuffers();
    createDescriptors();
    createPipelines();
    createMeshes();
}

void Renderer::createCommandResources() {
    VkCommandPoolCreateInfo pci{};
    pci.sType = VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO;
    pci.flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT;
    pci.queueFamilyIndex = *ctx->families.graphics;
    vkCheck(vkCreateCommandPool(ctx->device, &pci, nullptr, &commandPool), "vkCreateCommandPool");

    VkCommandBufferAllocateInfo ai{};
    ai.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO;
    ai.commandPool = commandPool;
    ai.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
    ai.commandBufferCount = MAX_FRAMES_IN_FLIGHT;
    vkCheck(vkAllocateCommandBuffers(ctx->device, &ai, commandBuffers.data()),
            "vkAllocateCommandBuffers");
}

void Renderer::createSyncObjects() {
    VkSemaphoreCreateInfo sci{};
    sci.sType = VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO;

    VkFenceCreateInfo fci{};
    fci.sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO;
    fci.flags = VK_FENCE_CREATE_SIGNALED_BIT;   // so the first wait returns immediately

    for (FrameSync& s : sync) {
        vkCheck(vkCreateSemaphore(ctx->device, &sci, nullptr, &s.imageAvailable),
                "vkCreateSemaphore");
        vkCheck(vkCreateSemaphore(ctx->device, &sci, nullptr, &s.renderFinished),
                "vkCreateSemaphore");
        vkCheck(vkCreateFence(ctx->device, &fci, nullptr, &s.inFlight), "vkCreateFence");
    }
}

Buffer Renderer::createBuffer(VkDeviceSize size, VkBufferUsageFlags usage,
                              VmaAllocationCreateFlags flags) {
    VkBufferCreateInfo bi{};
    bi.sType = VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO;
    bi.size = size;
    bi.usage = usage;
    bi.sharingMode = VK_SHARING_MODE_EXCLUSIVE;

    VmaAllocationCreateInfo ai{};
    ai.usage = VMA_MEMORY_USAGE_AUTO;
    ai.flags = flags;

    Buffer b;
    VmaAllocationInfo info{};
    vkCheck(vmaCreateBuffer(ctx->allocator, &bi, &ai, &b.buffer, &b.alloc, &info),
            "vmaCreateBuffer");
    b.mapped = info.pMappedData;
    return b;
}

void Renderer::destroyBuffer(Buffer& b) {
    if (b.buffer) vmaDestroyBuffer(ctx->allocator, b.buffer, b.alloc);
    b = {};
}

/// Allocate a throwaway command buffer, record `record` into it, submit, and
/// block until the GPU is done. Only ever used at startup.
void Renderer::immediateSubmit(const std::function<void(VkCommandBuffer)>& record) {
    VkCommandBufferAllocateInfo ai{};
    ai.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO;
    ai.commandPool = commandPool;
    ai.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
    ai.commandBufferCount = 1;

    VkCommandBuffer cmd = VK_NULL_HANDLE;
    vkCheck(vkAllocateCommandBuffers(ctx->device, &ai, &cmd), "vkAllocateCommandBuffers");

    VkCommandBufferBeginInfo bi{};
    bi.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO;
    bi.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT;
    vkCheck(vkBeginCommandBuffer(cmd, &bi), "vkBeginCommandBuffer");
    record(cmd);
    vkCheck(vkEndCommandBuffer(cmd), "vkEndCommandBuffer");

    VkSubmitInfo submit{};
    submit.sType = VK_STRUCTURE_TYPE_SUBMIT_INFO;
    submit.commandBufferCount = 1;
    submit.pCommandBuffers = &cmd;
    vkCheck(vkQueueSubmit(ctx->graphicsQueue, 1, &submit, VK_NULL_HANDLE), "vkQueueSubmit");
    vkQueueWaitIdle(ctx->graphicsQueue);

    vkFreeCommandBuffers(ctx->device, commandPool, 1, &cmd);
}

/// Fill a device-local buffer through a temporary host-visible staging buffer.
Buffer Renderer::uploadStatic(const void* data, VkDeviceSize size, VkBufferUsageFlags usage) {
    Buffer staging = createBuffer(size, VK_BUFFER_USAGE_TRANSFER_SRC_BIT,
                                  VMA_ALLOCATION_CREATE_HOST_ACCESS_SEQUENTIAL_WRITE_BIT
                                      | VMA_ALLOCATION_CREATE_MAPPED_BIT);
    std::memcpy(staging.mapped, data, size_t(size));
    vkCheck(vmaFlushAllocation(ctx->allocator, staging.alloc, 0, VK_WHOLE_SIZE),
            "vmaFlushAllocation");

    Buffer dst = createBuffer(size, usage | VK_BUFFER_USAGE_TRANSFER_DST_BIT, 0);

    immediateSubmit([&](VkCommandBuffer cmd) {
        VkBufferCopy region{0, 0, size};
        vkCmdCopyBuffer(cmd, staging.buffer, dst.buffer, 1, &region);
    });

    destroyBuffer(staging);
    return dst;
}

void Renderer::createPerFrameBuffers() {
    const VmaAllocationCreateFlags hostWrite =
        VMA_ALLOCATION_CREATE_HOST_ACCESS_SEQUENTIAL_WRITE_BIT | VMA_ALLOCATION_CREATE_MAPPED_BIT;

    for (int i = 0; i < MAX_FRAMES_IN_FLIGHT; i++) {
        uniformBuffers[i] = createBuffer(sizeof(FrameUniforms),
                                         VK_BUFFER_USAGE_UNIFORM_BUFFER_BIT, hostWrite);
        instanceBuffers[i] = createBuffer(sizeof(InstanceData) * kMaxInstances,
                                          VK_BUFFER_USAGE_STORAGE_BUFFER_BIT, hostWrite);
        hudBuffers[i] = createBuffer(sizeof(HUDVertex) * kMaxHudVertices,
                                     VK_BUFFER_USAGE_VERTEX_BUFFER_BIT, hostWrite);
    }
}

void Renderer::createDescriptors() {
    VkDescriptorSetLayoutBinding bindings[2]{};
    bindings[0].binding = 0;
    bindings[0].descriptorType = VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER;
    bindings[0].descriptorCount = 1;
    bindings[0].stageFlags = VK_SHADER_STAGE_VERTEX_BIT | VK_SHADER_STAGE_FRAGMENT_BIT;
    bindings[1].binding = 1;
    bindings[1].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
    bindings[1].descriptorCount = 1;
    bindings[1].stageFlags = VK_SHADER_STAGE_VERTEX_BIT;

    VkDescriptorSetLayoutCreateInfo li{};
    li.sType = VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO;
    li.bindingCount = 2;
    li.pBindings = bindings;
    vkCheck(vkCreateDescriptorSetLayout(ctx->device, &li, nullptr, &setLayout),
            "vkCreateDescriptorSetLayout");

    VkDescriptorPoolSize sizes[2]{};
    sizes[0] = {VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER, MAX_FRAMES_IN_FLIGHT};
    sizes[1] = {VK_DESCRIPTOR_TYPE_STORAGE_BUFFER, MAX_FRAMES_IN_FLIGHT};

    VkDescriptorPoolCreateInfo pi{};
    pi.sType = VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO;
    pi.poolSizeCount = 2;
    pi.pPoolSizes = sizes;
    pi.maxSets = MAX_FRAMES_IN_FLIGHT;
    vkCheck(vkCreateDescriptorPool(ctx->device, &pi, nullptr, &descriptorPool),
            "vkCreateDescriptorPool");

    std::array<VkDescriptorSetLayout, MAX_FRAMES_IN_FLIGHT> layouts;
    layouts.fill(setLayout);

    VkDescriptorSetAllocateInfo ai{};
    ai.sType = VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO;
    ai.descriptorPool = descriptorPool;
    ai.descriptorSetCount = MAX_FRAMES_IN_FLIGHT;
    ai.pSetLayouts = layouts.data();
    vkCheck(vkAllocateDescriptorSets(ctx->device, &ai, descriptorSets.data()),
            "vkAllocateDescriptorSets");

    for (int i = 0; i < MAX_FRAMES_IN_FLIGHT; i++) {
        VkDescriptorBufferInfo ubo{uniformBuffers[i].buffer, 0, sizeof(FrameUniforms)};
        VkDescriptorBufferInfo ssbo{instanceBuffers[i].buffer, 0, VK_WHOLE_SIZE};

        VkWriteDescriptorSet writes[2]{};
        writes[0].sType = VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET;
        writes[0].dstSet = descriptorSets[i];
        writes[0].dstBinding = 0;
        writes[0].descriptorCount = 1;
        writes[0].descriptorType = VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER;
        writes[0].pBufferInfo = &ubo;
        writes[1].sType = VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET;
        writes[1].dstSet = descriptorSets[i];
        writes[1].dstBinding = 1;
        writes[1].descriptorCount = 1;
        writes[1].descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
        writes[1].pBufferInfo = &ssbo;

        vkUpdateDescriptorSets(ctx->device, 2, writes, 0, nullptr);
    }
}

VkShaderModule Renderer::loadShader(const std::string& path) {
    std::vector<char> code = readFile(path);

    VkShaderModuleCreateInfo ci{};
    ci.sType = VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO;
    ci.codeSize = code.size();
    ci.pCode = reinterpret_cast<const uint32_t*>(code.data());

    VkShaderModule module = VK_NULL_HANDLE;
    vkCheck(vkCreateShaderModule(ctx->device, &ci, nullptr, &module), "vkCreateShaderModule");
    return module;
}

VkPipeline Renderer::makePipeline(const char* vertPath, const char* fragPath,
                                  VkPrimitiveTopology topology, DepthMode depthMode,
                                  BlendMode blendMode, VertexLayout layout) {
    VkShaderModule vert = loadShader(vertPath);
    VkShaderModule frag = loadShader(fragPath);

    VkPipelineShaderStageCreateInfo stages[2]{};
    stages[0].sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO;
    stages[0].stage = VK_SHADER_STAGE_VERTEX_BIT;
    stages[0].module = vert;
    stages[0].pName = "main";
    stages[1].sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO;
    stages[1].stage = VK_SHADER_STAGE_FRAGMENT_BIT;
    stages[1].module = frag;
    stages[1].pName = "main";

    VkVertexInputBindingDescription binding{};
    VkVertexInputAttributeDescription attrs[2]{};
    uint32_t attrCount = 2;
    binding.binding = 0;
    binding.inputRate = VK_VERTEX_INPUT_RATE_VERTEX;
    if (layout == VertexLayout::Hud) {
        binding.stride = sizeof(HUDVertex);
        attrs[0] = {0, 0, VK_FORMAT_R32G32_SFLOAT, offsetof(HUDVertex, position)};
        attrs[1] = {1, 0, VK_FORMAT_R32G32B32A32_SFLOAT, offsetof(HUDVertex, color)};
    } else {
        binding.stride = sizeof(Vertex);
        attrs[0] = {0, 0, VK_FORMAT_R32G32B32_SFLOAT, offsetof(Vertex, position)};
        attrs[1] = {1, 0, VK_FORMAT_R32G32B32_SFLOAT, offsetof(Vertex, normal)};
        // unlit.vert reads only the position; declaring an attribute the shader
        // never consumes is a validation performance warning.
        if (layout == VertexLayout::MeshPositionOnly) attrCount = 1;
    }

    VkPipelineVertexInputStateCreateInfo vi{};
    vi.sType = VK_STRUCTURE_TYPE_PIPELINE_VERTEX_INPUT_STATE_CREATE_INFO;
    vi.vertexBindingDescriptionCount = 1;
    vi.pVertexBindingDescriptions = &binding;
    vi.vertexAttributeDescriptionCount = attrCount;
    vi.pVertexAttributeDescriptions = attrs;

    VkPipelineInputAssemblyStateCreateInfo ia{};
    ia.sType = VK_STRUCTURE_TYPE_PIPELINE_INPUT_ASSEMBLY_STATE_CREATE_INFO;
    ia.topology = topology;

    VkPipelineViewportStateCreateInfo vp{};
    vp.sType = VK_STRUCTURE_TYPE_PIPELINE_VIEWPORT_STATE_CREATE_INFO;
    vp.viewportCount = 1;
    vp.scissorCount = 1;   // contents are dynamic; only the counts are baked

    VkPipelineRasterizationStateCreateInfo rs{};
    rs.sType = VK_STRUCTURE_TYPE_PIPELINE_RASTERIZATION_STATE_CREATE_INFO;
    rs.polygonMode = VK_POLYGON_MODE_FILL;
    rs.cullMode = VK_CULL_MODE_NONE;   // our normals are self-correcting
    rs.frontFace = VK_FRONT_FACE_COUNTER_CLOCKWISE;
    rs.lineWidth = 1.0f;

    VkPipelineMultisampleStateCreateInfo ms{};
    ms.sType = VK_STRUCTURE_TYPE_PIPELINE_MULTISAMPLE_STATE_CREATE_INFO;
    ms.rasterizationSamples = VK_SAMPLE_COUNT_1_BIT;

    VkPipelineDepthStencilStateCreateInfo ds{};
    ds.sType = VK_STRUCTURE_TYPE_PIPELINE_DEPTH_STENCIL_STATE_CREATE_INFO;
    ds.depthTestEnable = depthMode == DepthMode::Off ? VK_FALSE : VK_TRUE;
    ds.depthWriteEnable = depthMode == DepthMode::TestWrite ? VK_TRUE : VK_FALSE;
    ds.depthCompareOp = VK_COMPARE_OP_LESS;
    ds.maxDepthBounds = 1.0f;

    VkPipelineColorBlendAttachmentState cb{};
    cb.colorWriteMask = VK_COLOR_COMPONENT_R_BIT | VK_COLOR_COMPONENT_G_BIT
                      | VK_COLOR_COMPONENT_B_BIT | VK_COLOR_COMPONENT_A_BIT;
    switch (blendMode) {
        case BlendMode::Opaque:
            cb.blendEnable = VK_FALSE;
            break;
        case BlendMode::Additive:
            cb.blendEnable = VK_TRUE;
            cb.srcColorBlendFactor = VK_BLEND_FACTOR_SRC_ALPHA;
            cb.dstColorBlendFactor = VK_BLEND_FACTOR_ONE;
            cb.colorBlendOp = VK_BLEND_OP_ADD;
            cb.srcAlphaBlendFactor = VK_BLEND_FACTOR_ONE;
            cb.dstAlphaBlendFactor = VK_BLEND_FACTOR_ONE;
            cb.alphaBlendOp = VK_BLEND_OP_ADD;
            break;
        case BlendMode::Alpha:
            cb.blendEnable = VK_TRUE;
            cb.srcColorBlendFactor = VK_BLEND_FACTOR_SRC_ALPHA;
            cb.dstColorBlendFactor = VK_BLEND_FACTOR_ONE_MINUS_SRC_ALPHA;
            cb.colorBlendOp = VK_BLEND_OP_ADD;
            cb.srcAlphaBlendFactor = VK_BLEND_FACTOR_ONE;
            cb.dstAlphaBlendFactor = VK_BLEND_FACTOR_ONE_MINUS_SRC_ALPHA;
            cb.alphaBlendOp = VK_BLEND_OP_ADD;
            break;
    }

    VkPipelineColorBlendStateCreateInfo blend{};
    blend.sType = VK_STRUCTURE_TYPE_PIPELINE_COLOR_BLEND_STATE_CREATE_INFO;
    blend.attachmentCount = 1;
    blend.pAttachments = &cb;

    VkDynamicState dynamicStates[] = {VK_DYNAMIC_STATE_VIEWPORT, VK_DYNAMIC_STATE_SCISSOR};
    VkPipelineDynamicStateCreateInfo dyn{};
    dyn.sType = VK_STRUCTURE_TYPE_PIPELINE_DYNAMIC_STATE_CREATE_INFO;
    dyn.dynamicStateCount = 2;
    dyn.pDynamicStates = dynamicStates;

    VkGraphicsPipelineCreateInfo pi{};
    pi.sType = VK_STRUCTURE_TYPE_GRAPHICS_PIPELINE_CREATE_INFO;
    pi.stageCount = 2;
    pi.pStages = stages;
    pi.pVertexInputState = &vi;
    pi.pInputAssemblyState = &ia;
    pi.pViewportState = &vp;
    pi.pRasterizationState = &rs;
    pi.pMultisampleState = &ms;
    pi.pDepthStencilState = &ds;
    pi.pColorBlendState = &blend;
    pi.pDynamicState = &dyn;
    pi.layout = pipelineLayout;
    pi.renderPass = swapchain->renderPass;
    pi.subpass = 0;

    VkPipeline pipeline = VK_NULL_HANDLE;
    vkCheck(vkCreateGraphicsPipelines(ctx->device, VK_NULL_HANDLE, 1, &pi, nullptr, &pipeline),
            "vkCreateGraphicsPipelines");

    vkDestroyShaderModule(ctx->device, frag, nullptr);
    vkDestroyShaderModule(ctx->device, vert, nullptr);
    return pipeline;
}

void Renderer::createPipelines() {
    VkPushConstantRange range{VK_SHADER_STAGE_VERTEX_BIT, 0, sizeof(StarParams)};

    VkPipelineLayoutCreateInfo li{};
    li.sType = VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO;
    li.setLayoutCount = 1;
    li.pSetLayouts = &setLayout;
    li.pushConstantRangeCount = 1;
    li.pPushConstantRanges = &range;
    vkCheck(vkCreatePipelineLayout(ctx->device, &li, nullptr, &pipelineLayout),
            "vkCreatePipelineLayout");

    litPipeline = makePipeline("shaders/lit.vert.spv", "shaders/lit.frag.spv",
                               VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST, DepthMode::TestWrite,
                               BlendMode::Opaque, VertexLayout::Mesh);
    gridPipeline = makePipeline("shaders/unlit.vert.spv", "shaders/unlit.frag.spv",
                                VK_PRIMITIVE_TOPOLOGY_LINE_LIST, DepthMode::TestWrite,
                                BlendMode::Additive, VertexLayout::MeshPositionOnly);
    boltPipeline = makePipeline("shaders/unlit.vert.spv", "shaders/unlit.frag.spv",
                                VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST, DepthMode::TestOnly,
                                BlendMode::Additive, VertexLayout::MeshPositionOnly);
    starPipeline = makePipeline("shaders/star.vert.spv", "shaders/star.frag.spv",
                                VK_PRIMITIVE_TOPOLOGY_POINT_LIST, DepthMode::TestOnly,
                                BlendMode::Additive, VertexLayout::Mesh);
    hudPipeline = makePipeline("shaders/hud.vert.spv", "shaders/hud.frag.spv",
                               VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST, DepthMode::Off,
                               BlendMode::Alpha, VertexLayout::Hud);
}

Mesh Renderer::uploadMesh(const MeshData& data) {
    Mesh m;
    m.vertexBuffer = uploadStatic(data.vertices.data(),
                                  data.vertices.size() * sizeof(Vertex),
                                  VK_BUFFER_USAGE_VERTEX_BUFFER_BIT);
    m.vertexCount = uint32_t(data.vertices.size());

    if (!data.indices.empty()) {
        m.indexBuffer = uploadStatic(data.indices.data(),
                                     data.indices.size() * sizeof(uint16_t),
                                     VK_BUFFER_USAGE_INDEX_BUFFER_BIT);
        m.indexCount = uint32_t(data.indices.size());
    }
    return m;
}

void Renderer::createMeshes() {
    meshes[MeshID::Ship] = uploadMesh(MeshLibrary::ship());
    meshes[MeshID::Enemy] = uploadMesh(MeshLibrary::enemy());
    meshes[MeshID::Bolt] = uploadMesh(MeshLibrary::bolt());
    meshes[MeshID::Star] = uploadMesh(MeshLibrary::starfield(kStarCount, kStarSpan));
    meshes[MeshID::Grid] = uploadMesh(MeshLibrary::grid(kGridHalfExtent, kGridSpacing));
}

void Renderer::uploadFrameData(const FrameData& frame) {
    std::memcpy(uniformBuffers[currentFrame].mapped, &frame.uniforms, sizeof(FrameUniforms));
    vkCheck(vmaFlushAllocation(ctx->allocator, uniformBuffers[currentFrame].alloc, 0,
                               VK_WHOLE_SIZE), "vmaFlushAllocation");

    // Flatten every mesh bucket into one array, remembering each slice.
    std::vector<InstanceData> all;
    groups.clear();
    for (const auto& entry : frame.byMesh) {
        if (entry.second.empty()) continue;
        groups.push_back({entry.first, uint32_t(all.size()), uint32_t(entry.second.size())});
        all.insert(all.end(), entry.second.begin(), entry.second.end());
    }

    // The grid is not an entity, so it contributes one hand-built instance.
    gridInstance = uint32_t(all.size());
    all.push_back(InstanceData{frame.gridModel, glm::vec4(0.12f, 0.35f, 0.45f, 1.0f)});

    if (all.size() > kMaxInstances) all.resize(kMaxInstances);
    std::memcpy(instanceBuffers[currentFrame].mapped, all.data(),
                all.size() * sizeof(InstanceData));
    vkCheck(vmaFlushAllocation(ctx->allocator, instanceBuffers[currentFrame].alloc, 0,
                               VK_WHOLE_SIZE), "vmaFlushAllocation");

    hudVertexCount = uint32_t(std::min<size_t>(frame.hud.size(), kMaxHudVertices));
    if (hudVertexCount > 0) {
        std::memcpy(hudBuffers[currentFrame].mapped, frame.hud.data(),
                    hudVertexCount * sizeof(HUDVertex));
        vkCheck(vmaFlushAllocation(ctx->allocator, hudBuffers[currentFrame].alloc, 0,
                                   VK_WHOLE_SIZE), "vmaFlushAllocation");
    }
}

void Renderer::drawMeshGroup(VkCommandBuffer cmd, const DrawGroup& group) {
    auto it = meshes.find(group.mesh);
    if (it == meshes.end()) return;
    const Mesh& m = it->second;

    VkDeviceSize zero = 0;
    vkCmdBindVertexBuffers(cmd, 0, 1, &m.vertexBuffer.buffer, &zero);
    if (m.indexCount > 0) {
        vkCmdBindIndexBuffer(cmd, m.indexBuffer.buffer, 0, VK_INDEX_TYPE_UINT16);
        vkCmdDrawIndexed(cmd, m.indexCount, group.count, 0, 0, group.first);
    } else {
        vkCmdDraw(cmd, m.vertexCount, group.count, 0, group.first);
    }
}

void Renderer::recordFrame(VkCommandBuffer cmd, uint32_t imageIndex) {
    VkCommandBufferBeginInfo bi{};
    bi.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO;
    vkCheck(vkBeginCommandBuffer(cmd, &bi), "vkBeginCommandBuffer");

    VkClearValue clears[2]{};
    clears[0].color = {{0.02f, 0.02f, 0.06f, 1.0f}};
    clears[1].depthStencil = {1.0f, 0};

    VkRenderPassBeginInfo rp{};
    rp.sType = VK_STRUCTURE_TYPE_RENDER_PASS_BEGIN_INFO;
    rp.renderPass = swapchain->renderPass;
    rp.framebuffer = swapchain->framebuffers[imageIndex];
    rp.renderArea.offset = {0, 0};
    rp.renderArea.extent = swapchain->extent;
    rp.clearValueCount = 2;
    rp.pClearValues = clears;
    vkCmdBeginRenderPass(cmd, &rp, VK_SUBPASS_CONTENTS_INLINE);

    VkViewport viewport{0.0f, 0.0f, float(swapchain->extent.width),
                        float(swapchain->extent.height), 0.0f, 1.0f};
    VkRect2D scissor{{0, 0}, swapchain->extent};
    vkCmdSetViewport(cmd, 0, 1, &viewport);
    vkCmdSetScissor(cmd, 0, 1, &scissor);

    vkCmdBindDescriptorSets(cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, pipelineLayout, 0, 1,
                            &descriptorSets[currentFrame], 0, nullptr);

    // 1. grid — lays down depth for the solids to test against
    vkCmdBindPipeline(cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, gridPipeline);
    drawMeshGroup(cmd, {MeshID::Grid, gridInstance, 1});

    // 2. stars — depth-tested but not depth-writing
    vkCmdBindPipeline(cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, starPipeline);
    StarParams starParams{kStarSpan};
    vkCmdPushConstants(cmd, pipelineLayout, VK_SHADER_STAGE_VERTEX_BIT, 0,
                       sizeof(StarParams), &starParams);
    drawMeshGroup(cmd, {MeshID::Star, 0, 1});

    // 3. ship and enemies — the only depth writers among the entities
    vkCmdBindPipeline(cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, litPipeline);
    for (const DrawGroup& g : groups)
        if (g.mesh == MeshID::Ship || g.mesh == MeshID::Enemy) drawMeshGroup(cmd, g);

    // 4. bolts — additive glow over everything solid
    vkCmdBindPipeline(cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, boltPipeline);
    for (const DrawGroup& g : groups)
        if (g.mesh == MeshID::Bolt) drawMeshGroup(cmd, g);

    // 5. HUD — no depth, alpha blended, always on top
    if (hudVertexCount > 0) {
        vkCmdBindPipeline(cmd, VK_PIPELINE_BIND_POINT_GRAPHICS, hudPipeline);
        VkDeviceSize zero = 0;
        vkCmdBindVertexBuffers(cmd, 0, 1, &hudBuffers[currentFrame].buffer, &zero);
        vkCmdDraw(cmd, hudVertexCount, 1, 0, 0);
    }
    vkCmdEndRenderPass(cmd);
    vkCheck(vkEndCommandBuffer(cmd), "vkEndCommandBuffer");
}

void Renderer::drawFrame(const FrameData& frame) {
    FrameSync& s = sync[currentFrame];

    // 1. Wait until this slot's previous GPU work is done.
    vkWaitForFences(ctx->device, 1, &s.inFlight, VK_TRUE, UINT64_MAX);

    // 2. Acquire an image; imageAvailable is signalled when it is ready.
    uint32_t imageIndex = 0;
    VkResult acquired = vkAcquireNextImageKHR(ctx->device, swapchain->handle, UINT64_MAX,
                                              s.imageAvailable, VK_NULL_HANDLE, &imageIndex);
    if (acquired == VK_ERROR_OUT_OF_DATE_KHR) {
        swapchain->recreate(*ctx, window);
        return;
    }
    if (acquired != VK_SUCCESS && acquired != VK_SUBOPTIMAL_KHR)
        vkCheck(acquired, "vkAcquireNextImageKHR");

    // Reset only once we know we will submit, or the fence never gets signalled.
    vkResetFences(ctx->device, 1, &s.inFlight);

    // 3. Write this frame's data and record its commands.
    uploadFrameData(frame);
    vkResetCommandBuffer(commandBuffers[currentFrame], 0);
    recordFrame(commandBuffers[currentFrame], imageIndex);

    // 4. Submit, ordered by the two semaphores and closed out by the fence.
    VkPipelineStageFlags waitStage = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT;
    VkSubmitInfo submit{};
    submit.sType = VK_STRUCTURE_TYPE_SUBMIT_INFO;
    submit.waitSemaphoreCount = 1;
    submit.pWaitSemaphores = &s.imageAvailable;
    submit.pWaitDstStageMask = &waitStage;
    submit.commandBufferCount = 1;
    submit.pCommandBuffers = &commandBuffers[currentFrame];
    submit.signalSemaphoreCount = 1;
    submit.pSignalSemaphores = &s.renderFinished;
    vkCheck(vkQueueSubmit(ctx->graphicsQueue, 1, &submit, s.inFlight), "vkQueueSubmit");

    // 5. Present once rendering has signalled renderFinished.
    VkPresentInfoKHR present{};
    present.sType = VK_STRUCTURE_TYPE_PRESENT_INFO_KHR;
    present.waitSemaphoreCount = 1;
    present.pWaitSemaphores = &s.renderFinished;
    present.swapchainCount = 1;
    present.pSwapchains = &swapchain->handle;
    present.pImageIndices = &imageIndex;

    VkResult presented = vkQueuePresentKHR(ctx->presentQueue, &present);
    if (presented == VK_ERROR_OUT_OF_DATE_KHR || presented == VK_SUBOPTIMAL_KHR ||
        framebufferResized) {
        framebufferResized = false;
        swapchain->recreate(*ctx, window);
    } else if (presented != VK_SUCCESS) {
        vkCheck(presented, "vkQueuePresentKHR");
    }

    // 6. Move to the next slot.
    currentFrame = (currentFrame + 1) % MAX_FRAMES_IN_FLIGHT;
}

void Renderer::destroy() {
    vkDeviceWaitIdle(ctx->device);

    for (auto& entry : meshes) {
        destroyBuffer(entry.second.vertexBuffer);
        destroyBuffer(entry.second.indexBuffer);
    }
    meshes.clear();

    for (VkPipeline p : {litPipeline, gridPipeline, boltPipeline, starPipeline, hudPipeline})
        if (p) vkDestroyPipeline(ctx->device, p, nullptr);
    if (pipelineLayout) vkDestroyPipelineLayout(ctx->device, pipelineLayout, nullptr);

    if (descriptorPool) vkDestroyDescriptorPool(ctx->device, descriptorPool, nullptr);
    if (setLayout) vkDestroyDescriptorSetLayout(ctx->device, setLayout, nullptr);

    for (int i = 0; i < MAX_FRAMES_IN_FLIGHT; i++) {
        destroyBuffer(uniformBuffers[i]);
        destroyBuffer(instanceBuffers[i]);
        destroyBuffer(hudBuffers[i]);
    }

    for (FrameSync& s : sync) {
        if (s.imageAvailable) vkDestroySemaphore(ctx->device, s.imageAvailable, nullptr);
        if (s.renderFinished) vkDestroySemaphore(ctx->device, s.renderFinished, nullptr);
        if (s.inFlight) vkDestroyFence(ctx->device, s.inFlight, nullptr);
    }

    if (commandPool) vkDestroyCommandPool(ctx->device, commandPool, nullptr);
}
