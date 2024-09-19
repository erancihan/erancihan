cmake_minimum_required(VERSION 3.17)
project(hello_window) 

set(CMAKE_CXX_STANDARD 20)

set(WINDOWS_KIT_VERSION "10.0.19041.0")

include_directories(
	AFTER
	"C:/Program Files (x86)/Microsoft Visual Studio/2022/Community/VC/Tools/MSVC/14.36.32532/include"
	"C:/Program Files (x86)/Windows Kits/10/Include/${WINDOWS_KIT_VERSION}/shared"
	"C:/Program Files (x86)/Windows Kits/10/Include/${WINDOWS_KIT_VERSION}/ucrt"
	"C:/Program Files (x86)/Windows Kits/10/Include/${WINDOWS_KIT_VERSION}/um"
	"C:/Program Files (x86)/Windows Kits/10/Include/${WINDOWS_KIT_VERSION}/winrt"
	"C:/Windows/SysWOW64"
	"C:/Windows/System32"
)
link_directories(
	"C:/Program Files (x86)/Microsoft Visual Studio/2022/Community/VC/Tools/MSVC/14.36.32532/lib/x64"
	"C:/Program Files (x86)/Microsoft Visual Studio/2022/Community/VC/Tools/MSVC/14.36.32532/atlmfc/lib/x64"
	"C:/Program Files (x86)/Windows Kits/10/Lib/${WINDOWS_KIT_VERSION}/ucrt/x64"
	"C:/Program Files (x86)/Windows Kits/10/Lib/${WINDOWS_KIT_VERSION}/um/x64"
	"C:/Windows/SysWOW64"
	"C:/Windows/System32"
)

## BEGIN: FETCH PROJECT FILES
file(GLOB SOURCE_FILES "src/*.cpp" "src/**/*.cpp" "src/*.h" "src/**/*.h" "src/*.cc")
## END

find_library(D3D12_LIBRARY d3d12.lib)
message(":: > ${D3D12_LIBRARY}")

add_executable(hello_window "src/main.cpp" ${SOURCE_FILES})
target_link_libraries(${PROJECT_NAME} "${D3D12_LIBRARY}")
