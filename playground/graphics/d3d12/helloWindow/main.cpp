#include <iostream>
#include <d3d12.h>
#include <dxgi.h>
#include <d3dcompiler.h>
#include <DirectXMath.h>

#include "src/info/print_graphics_cards_info.h"
#include "src/window/Core.h"
#include "src/a/a.h"
#include "src/window/Window.h"

int main(int argc, char* argv[])
{
    print_graphics_cards_info();

//    WindowRun(nullptr, nullptr, argv[1], SW_SHOWNORMAL);
    Window window(640, 360, L"Hello Window");
    return Win32Application::Run(&window, nullptr, SW_SHOWNORMAL);

    return 0;
}

