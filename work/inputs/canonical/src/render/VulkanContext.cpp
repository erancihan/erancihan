#include "render/VulkanContext.hpp"

#include <cstdio>
#include <cstring>
#include <set>
#include <stdexcept>
#include <string>
#include <vector>

namespace {

const char* kValidationLayer = "VK_LAYER_KHRONOS_validation";
const char* kDeviceExtensions[] = {VK_KHR_SWAPCHAIN_EXTENSION_NAME};

VKAPI_ATTR VkBool32 VKAPI_CALL debugCallback(
    VkDebugUtilsMessageSeverityFlagBitsEXT, VkDebugUtilsMessageTypeFlagsEXT,
    const VkDebugUtilsMessengerCallbackDataEXT* data, void*) {
    std::fprintf(stderr, "[vulkan] %s\n", data->pMessage);
    return VK_FALSE;   // do not abort the offending call
}

bool hasValidationLayer() {
    uint32_t n = 0;
    vkEnumerateInstanceLayerProperties(&n, nullptr);
    std::vector<VkLayerProperties> layers(n);
    vkEnumerateInstanceLayerProperties(&n, layers.data());
    for (const VkLayerProperties& l : layers)
        if (std::strcmp(l.layerName, kValidationLayer) == 0) return true;
    return false;
}

bool hasSwapchainExtension(VkPhysicalDevice dev) {
    uint32_t n = 0;
    vkEnumerateDeviceExtensionProperties(dev, nullptr, &n, nullptr);
    std::vector<VkExtensionProperties> exts(n);
    vkEnumerateDeviceExtensionProperties(dev, nullptr, &n, exts.data());
    for (const VkExtensionProperties& e : exts)
        if (std::strcmp(e.extensionName, VK_KHR_SWAPCHAIN_EXTENSION_NAME) == 0) return true;
    return false;
}

void fillDebugCreateInfo(VkDebugUtilsMessengerCreateInfoEXT& dbg) {
    dbg = {};
    dbg.sType = VK_STRUCTURE_TYPE_DEBUG_UTILS_MESSENGER_CREATE_INFO_EXT;
    dbg.messageSeverity = VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT
                        | VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT;
    dbg.messageType = VK_DEBUG_UTILS_MESSAGE_TYPE_VALIDATION_BIT_EXT
                    | VK_DEBUG_UTILS_MESSAGE_TYPE_PERFORMANCE_BIT_EXT;
    dbg.pfnUserCallback = debugCallback;
}

} // namespace

void vkCheck(VkResult result, const char* what) {
    if (result != VK_SUCCESS)
        throw std::runtime_error(std::string(what) + " failed with VkResult " +
                                 std::to_string(int(result)));
}

QueueFamilies findQueueFamilies(VkPhysicalDevice dev, VkSurfaceKHR surface) {
    uint32_t n = 0;
    vkGetPhysicalDeviceQueueFamilyProperties(dev, &n, nullptr);
    std::vector<VkQueueFamilyProperties> fams(n);
    vkGetPhysicalDeviceQueueFamilyProperties(dev, &n, fams.data());

    QueueFamilies out;
    for (uint32_t i = 0; i < n; i++) {
        if (fams[i].queueFlags & VK_QUEUE_GRAPHICS_BIT) out.graphics = i;
        VkBool32 canPresent = VK_FALSE;
        vkGetPhysicalDeviceSurfaceSupportKHR(dev, i, surface, &canPresent);
        if (canPresent) out.present = i;
    }
    return out;
}

void VulkanContext::init(GLFWwindow* w) {
    window = w;
    createInstance();
    createDebugMessenger();
    vkCheck(glfwCreateWindowSurface(instance, window, nullptr, &surface),
            "glfwCreateWindowSurface");
    pickPhysicalDevice();
    createLogicalDevice();
    createAllocator();
}

void VulkanContext::createInstance() {
    VkApplicationInfo app{};
    app.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
    app.pApplicationName = "SpaceFighter";
    app.applicationVersion = VK_MAKE_VERSION(1, 0, 0);
    app.pEngineName = "SpaceFighter";
    app.apiVersion = VK_API_VERSION_1_2;

    uint32_t glfwCount = 0;
    const char** glfwExt = glfwGetRequiredInstanceExtensions(&glfwCount);
    std::vector<const char*> extensions(glfwExt, glfwExt + glfwCount);

    std::vector<const char*> layers;
    bool validation = kEnableValidation && hasValidationLayer();
    if (validation) {
        layers.push_back(kValidationLayer);
        extensions.push_back(VK_EXT_DEBUG_UTILS_EXTENSION_NAME);
    } else if (kEnableValidation) {
        std::fprintf(stderr, "[vulkan] validation layers requested but not available\n");
    }

    VkInstanceCreateInfo ci{};
    ci.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO;
    ci.pApplicationInfo = &app;
    ci.enabledExtensionCount = uint32_t(extensions.size());
    ci.ppEnabledExtensionNames = extensions.data();
    ci.enabledLayerCount = uint32_t(layers.size());
    ci.ppEnabledLayerNames = layers.data();

    // Chained so the messenger also covers vkCreateInstance itself.
    VkDebugUtilsMessengerCreateInfoEXT dbg{};
    if (validation) {
        fillDebugCreateInfo(dbg);
        ci.pNext = &dbg;
    }

    vkCheck(vkCreateInstance(&ci, nullptr, &instance), "vkCreateInstance");
}

void VulkanContext::createDebugMessenger() {
    if (!kEnableValidation) return;
    auto create = reinterpret_cast<PFN_vkCreateDebugUtilsMessengerEXT>(
        vkGetInstanceProcAddr(instance, "vkCreateDebugUtilsMessengerEXT"));
    if (!create) return;

    VkDebugUtilsMessengerCreateInfoEXT dbg{};
    fillDebugCreateInfo(dbg);
    vkCheck(create(instance, &dbg, nullptr, &debugMessenger),
            "vkCreateDebugUtilsMessengerEXT");
}

void VulkanContext::pickPhysicalDevice() {
    uint32_t n = 0;
    vkEnumeratePhysicalDevices(instance, &n, nullptr);
    if (n == 0) throw std::runtime_error("no Vulkan-capable GPU found");
    std::vector<VkPhysicalDevice> devices(n);
    vkEnumeratePhysicalDevices(instance, &n, devices.data());

    int best = -1;
    for (VkPhysicalDevice dev : devices) {
        if (!hasSwapchainExtension(dev)) continue;
        if (!findQueueFamilies(dev, surface).ok()) continue;

        VkPhysicalDeviceProperties props;
        vkGetPhysicalDeviceProperties(dev, &props);
        int score = 0;
        if (props.deviceType == VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU) score += 1000;
        score += int(props.limits.maxImageDimension2D);

        if (score > best) {
            best = score;
            physical = dev;
            properties = props;
        }
    }
    if (physical == VK_NULL_HANDLE)
        throw std::runtime_error("no GPU can both render and present to this surface");

    families = findQueueFamilies(physical, surface);
    std::printf("[vulkan] using %s (Vulkan %u.%u)\n", properties.deviceName,
                VK_VERSION_MAJOR(properties.apiVersion),
                VK_VERSION_MINOR(properties.apiVersion));
}

void VulkanContext::createLogicalDevice() {
    float priority = 1.0f;
    std::set<uint32_t> unique = {*families.graphics, *families.present};
    std::vector<VkDeviceQueueCreateInfo> queueInfos;
    for (uint32_t f : unique) {
        VkDeviceQueueCreateInfo q{};
        q.sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO;
        q.queueFamilyIndex = f;
        q.queueCount = 1;
        q.pQueuePriorities = &priority;
        queueInfos.push_back(q);
    }

    VkPhysicalDeviceFeatures features{};
    features.largePoints = VK_TRUE;   // stars draw as 2-px points

    VkDeviceCreateInfo ci{};
    ci.sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO;
    ci.queueCreateInfoCount = uint32_t(queueInfos.size());
    ci.pQueueCreateInfos = queueInfos.data();
    ci.enabledExtensionCount = 1;
    ci.ppEnabledExtensionNames = kDeviceExtensions;
    ci.pEnabledFeatures = &features;

    vkCheck(vkCreateDevice(physical, &ci, nullptr, &device), "vkCreateDevice");
    vkGetDeviceQueue(device, *families.graphics, 0, &graphicsQueue);
    vkGetDeviceQueue(device, *families.present, 0, &presentQueue);
}

void VulkanContext::createAllocator() {
    VmaAllocatorCreateInfo aci{};
    aci.physicalDevice = physical;
    aci.device = device;
    aci.instance = instance;
    aci.vulkanApiVersion = VK_API_VERSION_1_2;
    vkCheck(vmaCreateAllocator(&aci, &allocator), "vmaCreateAllocator");
}

void VulkanContext::destroy() {
    if (allocator) vmaDestroyAllocator(allocator);
    if (device) vkDestroyDevice(device, nullptr);
    if (debugMessenger) {
        auto destroyMessenger = reinterpret_cast<PFN_vkDestroyDebugUtilsMessengerEXT>(
            vkGetInstanceProcAddr(instance, "vkDestroyDebugUtilsMessengerEXT"));
        if (destroyMessenger) destroyMessenger(instance, debugMessenger, nullptr);
    }
    if (surface) vkDestroySurfaceKHR(instance, surface, nullptr);
    if (instance) vkDestroyInstance(instance, nullptr);
}
