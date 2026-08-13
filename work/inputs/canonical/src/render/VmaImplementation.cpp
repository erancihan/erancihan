// VMA is a single-header library: exactly one translation unit must define
// VMA_IMPLEMENTATION to emit its definitions. Giving it a file of its own means
// its ~20k lines are compiled once and its warnings never mix with ours.

#define VMA_IMPLEMENTATION

#include <vulkan/vulkan.h>

#include "vk_mem_alloc.h"
