cmake_minimum_required(VERSION 3.17)
project(rendering_graphics)

set(CMAKE_CXX_STANDARD 20)

file(GLOB SOURCE_FILES "src/*.cpp" "src/**/*.cpp" "src/*.h" "src/**/*.h" "src/*.cc")

if (UNIX)
    find_package(OpenGL REQUIRED)
    find_package(GLUT REQUIRED)
    include_directories(${OPENGL_INCLUDE_DIRS} ${GLUT_INCLUDE_DIRS})

    list(FILTER SOURCE_FILES EXCLUDE REGEX ".*(.win.cpp)$")
endif()

if (WIN32)
    message("Loading Windows files")
    list(FILTER SOURCE_FILES EXCLUDE REGEX ".*(.linux.cpp)$")
endif()

add_executable(rendering_graphics main.cpp ${SOURCE_FILES})

if (UNIX)
    target_link_libraries(rendering_graphics ${OPENGL_LIBRARIES} ${GLUT_LIBRARY})
endif (UNIX)
if (WIN32)
    target_link_libraries(rendering_graphics d3d12.lib)
endif (WIN32)
