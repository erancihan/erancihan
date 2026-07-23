# 05 · Swapchain, commands & sync 🛠️

> **You'll leave this chapter with:** the whole path from a GLFW window to pixels
> on screen — **surface, swapchain, image views, the depth buffer, render pass,
> framebuffers, command pool/buffers** — and the piece Metal and MetalKit hid from
> us entirely: **semaphores, fences and frames-in-flight**. This is the longest
> chapter in the guide, because it's the part Vulkan makes you build by hand. Take
> it slowly; everything after it is easier.

In the Metal guide, one line — `view.currentDrawable` — gave us an image to draw
into, and MetalKit paced our frames and managed the depth texture. Vulkan gives
us none of that. We build the ring of images we present (the **swapchain**), the
depth image, the structure of a render (the **render pass**), the things to record
commands into (**command buffers**), and — the real lesson — the synchronization
that keeps a CPU and a GPU running in parallel without racing. File-wise, the
once-only objects this chapter builds live in `render/VulkanContext.cpp` and
`render/Swapchain.cpp` from chapter 01's map; the per-frame sequence at the end
is `Renderer::drawFrame`.

---

## The surface: Vulkan meets the window

Vulkan has no windowing of its own. GLFW bridges the two, turning our window into
a `VkSurfaceKHR` the swapchain can target — one call, cross-platform:

```cpp
VkSurfaceKHR surface;
glfwCreateWindowSurface(instance, window, nullptr, &surface);
```

That surface is what chapter 02's device selection tested for "can this queue
family present?" Now we use it to build the swapchain.

---

## The swapchain: the ring of images you present

A **swapchain** is a small set of images the window system owns, that you draw
into and hand back to be shown. It replaces `currentDrawable`: instead of MetalKit
vending you one image per frame, you create the whole ring up front and, each
frame, *acquire* the index of the next free one.

Creating it means making three choices the surface constrains, then filling the
inevitable `CreateInfo`.

### 1. Surface format (color space + pixel format)

Query what the surface supports and prefer 8-bit BGRA in sRGB:

```cpp
VkSurfaceFormatKHR chooseFormat(const std::vector<VkSurfaceFormatKHR>& available) {
    for (auto& f : available)
        if (f.format == VK_FORMAT_B8G8R8A8_SRGB &&
            f.colorSpace == VK_COLOR_SPACE_SRGB_NONLINEAR_KHR)
            return f;
    return available[0];                     // otherwise take whatever's first
}
```

### 2. Present mode (how frames are paced)

This is the vsync policy, chosen explicitly (Metal hid it behind the display
link):

- **`FIFO`** — a true queue, capped at the refresh rate. No tearing, always
  available. Our default; it's vsync.
- **`MAILBOX`** — like FIFO but a newer frame replaces a waiting one, so latency
  drops without tearing. Great if the GPU outruns the display; not always
  supported.
- **`IMMEDIATE`** — no sync, may tear. Lowest latency.

```cpp
VkPresentModeKHR choosePresent(const std::vector<VkPresentModeKHR>&) {
    return VK_PRESENT_MODE_FIFO_KHR;         // guaranteed to exist — vsync, our default
}
```

When you want lower latency, prefer `MAILBOX` when it appears in the supported
list and fall back to FIFO — a three-line upgrade. We stay on FIFO so the frame
loop is vsync-paced, which chapter 09 leans on.

### 3. Extent (the pixel size) and image count

Extent is usually the window's framebuffer size (clamped to the surface's
min/max); image count is "min supported + 1" so we're never blocked waiting on the
presenter for a free image.

```cpp
uint32_t imageCount = caps.minImageCount + 1;
if (caps.maxImageCount > 0) imageCount = std::min(imageCount, caps.maxImageCount);
```

### Putting it together

```cpp
VkSwapchainCreateInfoKHR ci{VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR};
ci.surface          = surface;
ci.minImageCount    = imageCount;
ci.imageFormat      = format.format;
ci.imageColorSpace  = format.colorSpace;
ci.imageExtent      = extent;
ci.imageArrayLayers = 1;
ci.imageUsage       = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT;   // we render into them
ci.preTransform     = caps.currentTransform;
ci.compositeAlpha   = VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR;
ci.presentMode      = presentMode;
ci.clipped          = VK_TRUE;
// if graphics/present families differ, set CONCURRENT sharing + the two indices;
// otherwise EXCLUSIVE (the common case).
vkCreateSwapchainKHR(device, &ci, nullptr, &swapchain);

// then retrieve the images the swapchain actually created:
vkGetSwapchainImagesKHR(device, swapchain, &imageCount, nullptr);
swapchainImages.resize(imageCount);
vkGetSwapchainImagesKHR(device, swapchain, &imageCount, swapchainImages.data());
```

You don't allocate these images — the swapchain owns them. You *do* need a way to
address each one, which is the next piece.

---

## Image views: how a pass addresses an image

A `VkImage` is opaque memory; a **`VkImageView`** describes how to interpret it
(format, which mip levels, color vs depth). Every swapchain image gets a view, and
that view is what a framebuffer attaches:

```cpp
for (size_t i = 0; i < swapchainImages.size(); i++) {
    VkImageViewCreateInfo v{VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO};
    v.image    = swapchainImages[i];
    v.viewType = VK_IMAGE_VIEW_TYPE_2D;
    v.format   = format.format;
    v.subresourceRange = {VK_IMAGE_ASPECT_COLOR_BIT, 0, 1, 0, 1};
    vkCreateImageView(device, &v, nullptr, &swapchainViews[i]);
}
```

---

## The depth buffer — now *our* job

In the Metal guide we handed `MTKView` a `depthStencilPixelFormat` and it created
and managed the depth texture for us. Vulkan has no such helper: we allocate a
depth image, back it with memory (VMA — chapter 07), and make a view, exactly once
(and again on resize). Conceptually it's the depth image from chapter 02's
draw-call walkthrough — the same-size image of distances that lets near hide far
— except now we own its creation.

```cpp
VkFormat depthFormat = VK_FORMAT_D32_SFLOAT;             // widely supported
// create a VkImage (usage = DEPTH_STENCIL_ATTACHMENT), allocate with VMA,
// then a VkImageView with aspect = VK_IMAGE_ASPECT_DEPTH_BIT.
```

We'll write the actual image-creation code in chapter 07 once VMA is in hand; for
now, hold the shape: **one color image per swapchain slot, one shared depth
image.**

---

## The render pass: declaring the shape of a render

A **render pass** is Vulkan's up-front description of a rendering operation: which
attachments (color, depth) it uses, what to do with them at the start (clear?
load?) and end (store? discard?), and the layouts they transition through. Metal
folded this into the render-pass *descriptor* it built each frame; Vulkan makes it
a first-class object you create **once** and reuse.

```cpp
VkAttachmentDescription color{};
color.format         = swapchainFormat;
color.samples        = VK_SAMPLE_COUNT_1_BIT;
color.loadOp         = VK_ATTACHMENT_LOAD_OP_CLEAR;      // clear to deep blue each frame
color.storeOp        = VK_ATTACHMENT_STORE_OP_STORE;     // keep the result to present
color.initialLayout  = VK_IMAGE_LAYOUT_UNDEFINED;
color.finalLayout    = VK_IMAGE_LAYOUT_PRESENT_SRC_KHR;  // ready to show

VkAttachmentDescription depth{};
depth.format         = VK_FORMAT_D32_SFLOAT;
depth.samples        = VK_SAMPLE_COUNT_1_BIT;
depth.loadOp         = VK_ATTACHMENT_LOAD_OP_CLEAR;      // clear depth to 1.0
depth.storeOp        = VK_ATTACHMENT_STORE_OP_DONT_CARE; // we never read it back
depth.finalLayout    = VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL;

// one subpass referencing color (attachment 0) + depth (attachment 1),
// plus a VkSubpassDependency so the pass waits for the image to be acquired.
vkCreateRenderPass(device, &rpci, nullptr, &renderPass);
```

The `loadOp = CLEAR` / `storeOp = STORE` on color is the exact analogue of Metal's
"clear the color texture, keep the result"; the `finalLayout = PRESENT_SRC_KHR`
is Vulkan being explicit about the image *layout transition* the presenter needs —
a concept Metal never exposed.

> **A note on dynamic rendering.** Since Vulkan 1.3 (and the
> `VK_KHR_dynamic_rendering` extension before it), you can **skip render-pass and
> framebuffer objects entirely** and just declare your attachments inline at draw
> time with `vkCmdBeginRendering`. It's less boilerplate and the modern default
> for new engines. We use the classic render-pass path here because it makes the
> attachment/subpass model *explicit* — which is what you're here to learn — and
> because it's what most existing samples show. Chapter 14 points you at dynamic
> rendering as the first refactor to try once this all makes sense.

---

## Framebuffers: binding views to a pass

A **framebuffer** is the concrete set of image views a render pass draws into —
one per swapchain image, each pairing that image's color view with the shared
depth view:

```cpp
for (size_t i = 0; i < swapchainViews.size(); i++) {
    VkImageView attachments[] = { swapchainViews[i], depthView };
    VkFramebufferCreateInfo fb{VK_STRUCTURE_TYPE_FRAMEBUFFER_CREATE_INFO};
    fb.renderPass = renderPass;
    fb.attachmentCount = 2;
    fb.pAttachments    = attachments;
    fb.width = extent.width; fb.height = extent.height; fb.layers = 1;
    vkCreateFramebuffer(device, &fb, nullptr, &framebuffers[i]);
}
```

So the addressing chain is: **swapchain image → image view → framebuffer → render
pass**. Acquire an image index each frame, and `framebuffers[index]` is where you
draw.

---

## Command pool and command buffers

Commands aren't executed as you call them — they're **recorded** into a command
buffer and submitted later (same as Metal). A **command pool** allocates those
buffers from the graphics queue family; we allocate one command buffer per
frame-in-flight:

```cpp
VkCommandPoolCreateInfo pci{VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO};
pci.flags            = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT;  // re-record each frame
pci.queueFamilyIndex = graphicsFamily;
vkCreateCommandPool(device, &pci, nullptr, &commandPool);

VkCommandBufferAllocateInfo ai{VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO};
ai.commandPool        = commandPool;
ai.level              = VK_COMMAND_BUFFER_LEVEL_PRIMARY;
ai.commandBufferCount = MAX_FRAMES_IN_FLIGHT;      // = 2; defined in the sync section below
vkAllocateCommandBuffers(device, &ai, commandBuffers.data());
```

Recording one frame looks like this — begin, begin the render pass with its clear
values, (the draws go here, chapters 06–07 and 13), end:

```cpp
void recordFrame(VkCommandBuffer cmd, uint32_t imageIndex, /* draw data */) {
    VkCommandBufferBeginInfo bi{VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO};
    vkBeginCommandBuffer(cmd, &bi);

    VkClearValue clears[2];
    clears[0].color        = {{0.02f, 0.02f, 0.06f, 1.0f}};   // deep blue
    clears[1].depthStencil = {1.0f, 0};                       // far

    VkRenderPassBeginInfo rp{VK_STRUCTURE_TYPE_RENDER_PASS_BEGIN_INFO};
    rp.renderPass  = renderPass;
    rp.framebuffer = framebuffers[imageIndex];
    rp.renderArea.extent = extent;
    rp.clearValueCount = 2;
    rp.pClearValues    = clears;
    vkCmdBeginRenderPass(cmd, &rp, VK_SUBPASS_CONTENTS_INLINE);

    // ---- set viewport/scissor, bind pipelines, draw grid → stars → ships → bolts → HUD ----

    vkCmdEndRenderPass(cmd);
    vkEndCommandBuffer(cmd);
}
```

That skeleton is the same "clear, encode draws, finish" shape as Metal's encoder —
the draws inside are chapters 06, 07 and 13. What's genuinely new is what happens
*around* it: getting an image to draw into, and knowing when the GPU is done with
the last one. That's synchronization.

---

## Synchronization: the thing MetalKit hid

Here is the heart of the chapter. The CPU and GPU run **in parallel**. The CPU
races ahead recording frame *N+1* while the GPU still chews on frame *N*. Nothing
stops the CPU from overwriting a buffer the GPU is mid-read on, or from asking to
present an image that isn't finished — *nothing*, unless you say so. Metal (with
`MTKView` and a semaphore pattern it nudged you toward) largely managed this for
you. Vulkan does not. You order the work with two primitives:

- **Semaphore** — orders work *between GPU queue operations*. "Don't start
  rendering until the image is acquired"; "don't present until rendering is done."
  Purely GPU-side; the CPU never waits on one.
- **Fence** — orders work *between the GPU and the CPU*. "CPU, block here until the
  GPU signals this fence." This is how the CPU knows a frame's resources are free
  to reuse.

We need three per frame:

```cpp
struct FrameSync {
    VkSemaphore imageAvailable;   // GPU: image acquired → ok to render
    VkSemaphore renderFinished;   // GPU: rendering done → ok to present
    VkFence     inFlight;         // CPU: this frame's GPU work has completed
};
```

Create them once at init, next to the command buffers — and note the one flag
doing serious work:

```cpp
VkSemaphoreCreateInfo sci{VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO};
VkFenceCreateInfo     fci{VK_STRUCTURE_TYPE_FENCE_CREATE_INFO};
fci.flags = VK_FENCE_CREATE_SIGNALED_BIT;            // ← start life signaled
for (FrameSync& s : frames) {
    vkCreateSemaphore(device, &sci, nullptr, &s.imageAvailable);
    vkCreateSemaphore(device, &sci, nullptr, &s.renderFinished);
    vkCreateFence(device, &fci, nullptr, &s.inFlight);
}
```

**Why signaled?** The first thing `drawFrame` ever does is wait on this fence —
but on frame 1 nothing has been submitted yet, so nothing will ever signal it,
and an unsignaled fence would block forever. That's the classic Vulkan
first-frame deadlock, and `VK_FENCE_CREATE_SIGNALED_BIT` is the fix: the first
wait returns immediately, and every later wait is satisfied by the previous
submission on that slot.

### Frames in flight

If we had exactly *one* set of these, the CPU would record a frame, then block on
the fence until the GPU finished it, then record the next — CPU and GPU taking
turns, each idle half the time. **Frames in flight** fixes that: keep *N* sets
(we use two) and cycle through them, so while the GPU works on frame *N* the CPU
is already building frame *N+1* with a different set of sync objects and command
buffer. Two is the standard sweet spot — enough to keep both busy, not so many
that input latency piles up.

```cpp
constexpr int MAX_FRAMES_IN_FLIGHT = 2;
```

### The frame, in order

Everything above exists to make `drawFrame` correct. Read it as a fixed sequence —
this is *the* Vulkan frame:

```cpp
void drawFrame(/* per-frame draw data */) {
    FrameSync& s = frames[currentFrame];

    // 1. Wait until THIS frame slot's previous GPU work is done.
    //    (The fence was created signaled, so frame 1 sails through.)
    vkWaitForFences(device, 1, &s.inFlight, VK_TRUE, UINT64_MAX);

    // 2. Acquire the next swapchain image; the GPU will signal imageAvailable when ready.
    uint32_t imageIndex;
    VkResult r = vkAcquireNextImageKHR(device, swapchain, UINT64_MAX,
                                       s.imageAvailable, VK_NULL_HANDLE, &imageIndex);
    if (r == VK_ERROR_OUT_OF_DATE_KHR) { recreateSwapchain(); return; }   // resized

    vkResetFences(device, 1, &s.inFlight);        // only reset once we know we'll submit

    // 3. Record this frame's commands.
    vkResetCommandBuffer(commandBuffers[currentFrame], 0);
    recordFrame(commandBuffers[currentFrame], imageIndex, /* draw data */);

    // 4. Submit: wait on imageAvailable before writing color, signal renderFinished,
    //    and signal inFlight when the whole thing completes.
    VkPipelineStageFlags waitStage = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT;
    VkSubmitInfo submit{VK_STRUCTURE_TYPE_SUBMIT_INFO};
    submit.waitSemaphoreCount   = 1;   submit.pWaitSemaphores   = &s.imageAvailable;
    submit.pWaitDstStageMask    = &waitStage;
    submit.commandBufferCount   = 1;   submit.pCommandBuffers   = &commandBuffers[currentFrame];
    submit.signalSemaphoreCount = 1;   submit.pSignalSemaphores = &s.renderFinished;
    vkQueueSubmit(graphicsQueue, 1, &submit, s.inFlight);

    // 5. Present: wait on renderFinished, then show imageIndex.
    VkPresentInfoKHR present{VK_STRUCTURE_TYPE_PRESENT_INFO_KHR};
    present.waitSemaphoreCount = 1;   present.pWaitSemaphores = &s.renderFinished;
    present.swapchainCount     = 1;   present.pSwapchains     = &swapchain;
    present.pImageIndices      = &imageIndex;
    r = vkQueuePresentKHR(presentQueue, &present);
    if (r == VK_ERROR_OUT_OF_DATE_KHR || r == VK_SUBOPTIMAL_KHR || framebufferResized)
        recreateSwapchain();

    // 6. Advance to the next frame slot.
    currentFrame = (currentFrame + 1) % MAX_FRAMES_IN_FLIGHT;
}
```

Trace the sync once and it clicks:

- **`waitStage = COLOR_ATTACHMENT_OUTPUT`** is a precise touch: the GPU can run the
  *vertex* work before the image is even acquired, and only stall at the moment it
  needs to *write color*. Vulkan lets you order at that granularity.
- **The fence** is why step 1 is safe: by the time `vkWaitForFences` returns, the
  command buffer and per-frame buffers for *this slot* are guaranteed free to
  re-record and overwrite.
- **The two semaphores** chain the GPU-side order: acquire → (imageAvailable) →
  render → (renderFinished) → present. The CPU never waits on either.

Set `MAX_FRAMES_IN_FLIGHT` to 1 and you'll *feel* the difference — the fence wait
in step 1 now blocks on the frame you just submitted, and CPU/GPU stop overlapping.
That experiment is the fastest way to internalise why frames-in-flight exists.

> **Where you'd tighten this.** For clarity we key `renderFinished` by
> frame-in-flight. Strictly, though, the fence only proves the *submit* finished
> — the presentation engine may still be waiting on that semaphore when this slot
> cycles around, so the reuse isn't formally guaranteed, and recent validation
> layers flag exactly this. The fully-correct form keys the render-finished
> semaphore **per swapchain image**. It doesn't change the shape above — chapter
> 14 lists it among the "make it production" items.

---

## Swapchain recreation: handling resize

A window resize (or minimise, or moving between monitors) makes the swapchain
**out of date** — its images no longer match the surface. `vkAcquireNextImageKHR`
and `vkQueuePresentKHR` tell you so with `VK_ERROR_OUT_OF_DATE_KHR`, and GLFW's
framebuffer-resize callback sets our `framebufferResized` flag. The fix is to
rebuild everything size-dependent:

```cpp
void recreateSwapchain() {
    int w = 0, h = 0;
    glfwGetFramebufferSize(window, &w, &h);
    while (w == 0 || h == 0) {                          // minimised: wait it out
        glfwGetFramebufferSize(window, &w, &h);
        glfwWaitEvents();
    }
    vkDeviceWaitIdle(device);                            // don't touch in-use objects

    destroySwapchainResources();                        // views, depth, framebuffers, swapchain
    createSwapchain();                                  // all of the above, at the new size
    createDepthResources();
    createFramebuffers();
    framebufferResized = false;
}
```

`vkDeviceWaitIdle` before destroying is the blunt-but-correct move: it blocks until
the GPU is completely idle, so nothing we free is still in use. (A shipping engine
recreates more surgically to avoid the stall, but at our scale the hitch on resize
is invisible.) The pipelines and render pass survive because they don't depend on
the extent — we made viewport and scissor **dynamic state** for exactly this
reason (chapter 06), so a resize doesn't force a pipeline rebuild.

---

## The one-screen summary

- **Surface → swapchain → image views → framebuffers → render pass** is the
  addressing chain from window to drawable; you build all of it (Metal handed you
  `currentDrawable`).
- You own the **depth buffer** now, too — one image, cleared to 1.0 each frame.
- The **render pass** declares attachments, load/store ops, and layout
  transitions up front; **dynamic rendering** is the modern shortcut (chapter 14).
- **Synchronization is the real lesson:** semaphores order GPU→GPU (acquire →
  render → present), fences order GPU→CPU (is this frame's work done?), and
  **frames-in-flight** (we use 2) keep the CPU and GPU overlapping instead of
  taking turns.
- **Recreate the swapchain** on `OUT_OF_DATE`/resize; dynamic viewport/scissor
  spares the pipelines.

That's the frame. Everything from here — pipelines, buffers, the game — records
*into* the command buffer this chapter set up, guarded by the sync it built.

---

**Next:** what goes *inside* the render pass — the pipeline object and the SPIR-V
shaders. → [Chapter 06: The graphics pipeline & SPIR-V](06-the-graphics-pipeline.md)
