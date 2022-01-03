cmake_minimum_required(VERSION 3.17)
project(dx_learning)

set(CMAKE_CXX_STANDARD 20)

## BEGIN: FETCH PROJECT FILES
file(GLOB SOURCE_FILES "src/*.cpp" "src/**/*.cpp" "src/*.h" "src/**/*.h" "src/*.cc")
## END

find_library(D3D12_LIBRARY d3d12.lib)
message("> ${D3D12_LIBRARY}")

add_executable(dx_learning main.cpp ${SOURCE_FILES})
target_link_libraries(${PROJECT_NAME} "${D3D12_LIBRARY}")
