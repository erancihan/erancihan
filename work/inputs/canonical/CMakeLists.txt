cmake_minimum_required(VERSION 3.19)
project(SpaceFighter LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Vulkan REQUIRED)
find_package(glfw3 3.3 REQUIRED)
find_package(glm REQUIRED)

add_executable(SpaceFighter
    src/main.cpp
    src/Mesh.cpp
    src/Game.cpp
    src/HUD.cpp
    src/render/VmaImplementation.cpp
    src/render/VulkanContext.cpp
    src/render/Swapchain.cpp
    src/render/Renderer.cpp
)

target_include_directories(SpaceFighter PRIVATE src third_party)
target_link_libraries(SpaceFighter PRIVATE Vulkan::Vulkan glfw)

if (TARGET glm::glm)
    target_link_libraries(SpaceFighter PRIVATE glm::glm)
endif()

# --- Compile GLSL to SPIR-V at build time --------------------------------
# The LunarG SDK ships glslc; some Linux distributions ship only
# glslangValidator. Either works, they just take different flags.
if (TARGET Vulkan::glslc)
    set(GLSL_COMPILER Vulkan::glslc)
    set(GLSL_FLAGS "")
elseif (TARGET Vulkan::glslangValidator)
    set(GLSL_COMPILER Vulkan::glslangValidator)
    set(GLSL_FLAGS -V)
else()
    message(FATAL_ERROR "No GLSL compiler found. Install the Vulkan SDK.")
endif()

file(GLOB SHADERS CONFIGURE_DEPENDS
     "${CMAKE_SOURCE_DIR}/shaders/*.vert"
     "${CMAKE_SOURCE_DIR}/shaders/*.frag")

foreach(shader ${SHADERS})
    get_filename_component(name ${shader} NAME)
    set(spv "${CMAKE_BINARY_DIR}/shaders/${name}.spv")
    add_custom_command(
        OUTPUT ${spv}
        COMMAND ${CMAKE_COMMAND} -E make_directory "${CMAKE_BINARY_DIR}/shaders"
        COMMAND ${GLSL_COMPILER} ${GLSL_FLAGS} ${shader} -o ${spv}
        DEPENDS ${shader}
        COMMENT "compiling ${name} -> ${name}.spv")
    list(APPEND SPV_FILES ${spv})
endforeach()

add_custom_target(shaders DEPENDS ${SPV_FILES})
add_dependencies(SpaceFighter shaders)
