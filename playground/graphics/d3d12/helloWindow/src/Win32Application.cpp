#include <algorithm>

#include "Win32Application.h"

HWND Win32Application::m_hwnd = nullptr;

int Win32Application::Run(Core* pCore, HINSTANCE hInstance, int nCmdShow)
{
    std::string m_windowClassName = "DXSampleClass";
    std::string m_title = [](std::wstring title)
    {
        std::string str;
        std::transform(title.begin(), title.end(), std::back_inserter(str), [](wchar_t c)
        { return (char)c; });

        return str;
    }(pCore->GetTitle());

    // Parse the command line parameters
    int argc;
    LPWSTR* argv = CommandLineToArgvW(GetCommandLineW(), &argc);
    pCore->ParseCommandLineArgs(argv, argc);
    LocalFree(argv);

    // Initialize the window class.
    WNDCLASSEX windowClass = { 0 };
    windowClass.cbSize = sizeof(WNDCLASSEX);
    windowClass.style = CS_HREDRAW | CS_VREDRAW;
    windowClass.lpfnWndProc = WindowProc;
    windowClass.hInstance = hInstance;
    windowClass.hCursor = LoadCursor(NULL, IDC_ARROW);
    windowClass.lpszClassName = m_windowClassName.c_str();
    RegisterClassEx(&windowClass);

    int x = CW_USEDEFAULT;
    int y = CW_USEDEFAULT;
    RECT m_rc = {0, 0, static_cast<LONG>(pCore->GetWidth()), static_cast<LONG>(pCore->GetHeight()) };
    AdjustWindowRect(&m_rc, WS_OVERLAPPEDWINDOW, FALSE);

    // Create the window and store a handle to it.
    m_hwnd = CreateWindowEx(
        NULL,                       // ??
        m_windowClassName.c_str(),  // name of the window class
        m_title.c_str(),            // title of the window
        WS_OVERLAPPEDWINDOW,        // window style
        x,                          // x-position of the window
        y,                          // y-position of the window
        (m_rc.right - m_rc.left),   // width
        (m_rc.bottom - m_rc.top),   // height
        nullptr,                    // We have no parent window.
        nullptr,                    // We aren't using menus.
        hInstance,                  // application handle
        pCore
    );

    // Initialize the sample. OnInit is defined in each child-implementation of DXSample.
    pCore->OnInit();

    ShowWindow(m_hwnd, nCmdShow);

    // Main sample loop.
    MSG msg = {};
    while (msg.message != WM_QUIT)
    {
        // Process any messages in the queue.
        if (PeekMessage(&msg, NULL, 0, 0, PM_REMOVE))
        {
            TranslateMessage(&msg);
            DispatchMessage(&msg);
        }
    }

    pCore->OnDestroy();

    // Return this part of the WM_QUIT message to Windows.
    return static_cast<char>(msg.wParam);
}

// Main message handler for the sample.
LRESULT CALLBACK Win32Application::WindowProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam)
{
    Core* pCore = reinterpret_cast<Core*>(GetWindowLongPtr(hWnd, GWLP_USERDATA));

    switch (message)
    {
    case WM_CREATE:
        {
            // Save the DXSample* passed in to CreateWindow.
            LPCREATESTRUCT pCreateStruct = reinterpret_cast<LPCREATESTRUCT>(lParam);
            SetWindowLongPtr(hWnd, GWLP_USERDATA, reinterpret_cast<LONG_PTR>(pCreateStruct->lpCreateParams));
        }
        return 0;

    case WM_KEYDOWN:
        if (pCore)
        {
            pCore->OnKeyDown(static_cast<UINT8>(wParam));
        }
        return 0;

    case WM_KEYUP:
        if (pCore)
        {
            pCore->OnKeyUp(static_cast<UINT8>(wParam));
        }
        return 0;

    case WM_PAINT:
        if (pCore)
        {
            pCore->OnUpdate();
            pCore->OnRender();
        }
        return 0;

    case WM_DESTROY:
        PostQuitMessage(0);
        return 0;
    }

    // Handle any messages the switch statement didn't.
    return DefWindowProc(hWnd, message, wParam, lParam);
}
