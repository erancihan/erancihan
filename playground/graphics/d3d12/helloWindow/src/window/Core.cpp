#include "Core.h"

#include <utility>

Core::Core(UINT width, UINT height, std::wstring title)
    : m_width(width), m_height(height), m_title(std::move(title)), m_useWarpDevice(false)
{
    WCHAR assetPath[MAX_PATH];
    GetAssetsPath(assetPath, _countof(assetPath));
    m_assetsPath = assetPath;

    m_aspectRatio = static_cast<float>(width) / static_cast<float>(height);
}

Core::~Core() { }

// Helper function for resolving the full path of assets.
std::wstring Core::GetAssetFullPath(LPCWSTR assetName)
{
    return m_assetsPath + assetName;
}

// Helper function for acquiring the first available hardware adapter that supports Direct3D 12.
// If no such adapter can be found, *ppAdapter will be set to nullptr.
_Use_decl_annotations_
void Core::GetHardwareAdapter(IDXGIFactory1 *pFactory, IDXGIAdapter1 **ppAdapter, bool requestHighPerformanceAdapter)
{
    *ppAdapter = nullptr;

    ComPtr<IDXGIAdapter1> adapter;

    ComPtr<IDXGIFactory6> factory;
    auto hasInterface = SUCCEEDED(pFactory->QueryInterface(IID_PPV_ARGS(&factory)));
    for (
        UINT idx = 0;
        hasInterface
            ? (
                DXGI_ERROR_NOT_FOUND != factory->EnumAdapterByGpuPreference(
                        idx,
                        requestHighPerformanceAdapter == true
                            ? DXGI_GPU_PREFERENCE_HIGH_PERFORMANCE
                            : DXGI_GPU_PREFERENCE_UNSPECIFIED,
                        IID_PPV_ARGS(&adapter)
                    )
                )
            : (DXGI_ERROR_NOT_FOUND != factory->EnumAdapters1(idx, &adapter));
        ++idx
        )
    {
        DXGI_ADAPTER_DESC1 desc;
        adapter->GetDesc1(&desc);

        if (desc.Flags & DXGI_ADAPTER_FLAG_SOFTWARE)
        {
            // Don't select the Basic Render Driver adapter.
            // If you want a software adapter, pass in "/warp" on the command line.
            continue;
        }

        // Check to see whether the adapter supports Direct3D 12, but don't create the
        // actual device yet.
        if (SUCCEEDED(D3D12CreateDevice(adapter.Get(), D3D_FEATURE_LEVEL_11_0, _uuidof(ID3D12Device), nullptr)))
        {
            break;
        }
    }

    *ppAdapter = adapter.Detach();
}

// Helper function for setting the window's title text.
void Core::SetCustomWindowText(LPCWSTR text)
{
    std::wstring windowText = m_title + L": " + text;
    SetWindowTextW(Win32Application::GetHwnd(), windowText.c_str());
}

// Helper function for parsing any supplied command line args.
_Use_decl_annotations_
void Core::ParseCommandLineArgs(WCHAR **argv, int argc)
{
    for (auto i = 1; i < argc; ++i)
    {
        if (_wcsnicmp(argv[i], L"-warp", wcslen(argv[i])) == 0 || _wcsnicmp(argv[i], L"/warp", wcslen(argv[i])) == 0)
        {   // todo | what the fuck is this?
            m_useWarpDevice = true;
            m_title = m_title + L" (WARP)";
        }
    }
}
