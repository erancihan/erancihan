#include "a.h"

// properties
HINSTANCE   m_hInstance;
std::string m_windowClassName   = "WinMainWindowClass";
std::string m_windowTitle       = "Cube12";

int WINAPI WindowRun(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow)
{
    m_hInstance = hInstance;
    if (m_hInstance == nullptr)
    {
        m_hInstance = (HINSTANCE) GetModuleHandle(nullptr);
    }

    HICON hIcon = nullptr;
    WCHAR szExePath[MAX_PATH];
    GetModuleFileNameW(nullptr, szExePath, MAX_PATH);

    if (hIcon == nullptr)
    {
        hIcon = ExtractIconW(m_hInstance, szExePath, 0);
    }

    WNDCLASS wndClass; // TODO: explain what each var does
    wndClass.style = CS_DBLCLKS;
    wndClass.lpfnWndProc = WndProc;
    wndClass.cbClsExtra = 0;
    wndClass.cbWndExtra = 0;
    wndClass.hInstance = m_hInstance;
    wndClass.hIcon = hIcon;
    wndClass.hCursor = LoadCursor(nullptr, IDC_ARROW);
    wndClass.hbrBackground = (HBRUSH)GetStockObject(BLACK_BRUSH);
    wndClass.lpszMenuName = nullptr;
    wndClass.lpszClassName = m_windowClassName.c_str();

    if (!RegisterClass(&wndClass))
    {
        DWORD dwErr = GetLastError();
        if (dwErr != ERROR_CLASS_ALREADY_EXISTS)
        {
            return HRESULT_FROM_WIN32(dwErr);
        }
    }

    // create window
    RECT m_rc;
    int x = CW_USEDEFAULT;
    int y = CW_USEDEFAULT;

    // no menu in this example
    HMENU m_hMenu = nullptr;
    // This example uses a non-resizable 640 by 480 viewport for simplicity.
    int nDefaultWidth = 640;
    int nDefaultHeight = 480;
    SetRect(&m_rc, 0, 0, nDefaultWidth, nDefaultHeight);
    AdjustWindowRect(&m_rc,WS_OVERLAPPEDWINDOW,(m_hMenu != nullptr) ? true : false);

    // Create the window for our viewport.
    HWND m_hWnd;
    m_hWnd = CreateWindowEx(
        NULL,                       // ??
        m_windowClassName.c_str(),  // name of the window class
        m_windowTitle.c_str(),      // title of the window
        WS_OVERLAPPEDWINDOW,        // window style
        x,                          // x-position of the window
        y,                          // y-position of the window
        (m_rc.right - m_rc.left),   // width
        (m_rc.bottom - m_rc.top),   // height
        nullptr,                    // parent window, no parent window, NULL
        m_hMenu,                    // menu
        m_hInstance,                // application handle
        nullptr                     // used with multiple windows
    );

    if(m_hWnd == nullptr)
    {
        DWORD dwError = GetLastError();
        return HRESULT_FROM_WIN32(dwError);
    }

    std::cout << "Show Window" << std::endl;
    ShowWindow(m_hWnd, nCmdShow);

    bool bGotMsg;
    // this struct holds Windows event messages
    MSG msg;
    msg.message = WM_NULL;
    PeekMessage(&msg, nullptr, 0U, 0U, PM_NOREMOVE);

    // wait for the next message in the queue, store the result in 'msg'
    while(WM_QUIT != msg.message)
    {
        // Process window events.
        // Use PeekMessage() so we can use idle time to render the scene.
        bGotMsg = (PeekMessage(&msg, nullptr, 0U, 0U, PM_REMOVE) != 0);
        if (bGotMsg)
        {
            // translate keystroke messages into the right format
            TranslateMessage(&msg);

            // send the message to the WindowProc function
            DispatchMessage(&msg);
        }
        else
        {
            // todo ...
        }
    }

    return 0;
}

LRESULT CALLBACK WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam)
{
    // sort through and find what code to run for the message given
    switch(message)
    {
    case WM_CLOSE:
        {
            HMENU hMenu;
            hMenu = GetMenu(hWnd);
            if (hMenu != nullptr)
            {
                DestroyMenu(hMenu);
            }
            DestroyWindow(hWnd);
            UnregisterClass(m_windowClassName.c_str(), m_hInstance);
            return 0;
        }
        break;
    case WM_DESTROY:
        {
            // close the application entirely
            PostQuitMessage(0);
            return 0;
        }
        break;
    default:
        break;
    }

    // if nothing is handled
    return DefWindowProc(hWnd, message, wParam, lParam);
}
