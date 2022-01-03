// https://github.com/microsoft/DirectX-Graphics-Samples/tree/master/Samples/Desktop/D3D12HelloWorld/src/HelloWindow

#include <utility>
#include <iostream>

#ifndef CORE_H
#define CORE_H

#include "../stdafx.h"
#include "../Win32Application.h"
#include "../DXHelpers.h"

using namespace Microsoft::WRL;

class Core
{
public:
    Core(UINT width, UINT height, std::wstring title);
    virtual ~Core();

    virtual void OnInit() = 0;
    virtual void OnUpdate() = 0;
    virtual void OnRender() = 0;
    virtual void OnDestroy() = 0;

    // Samples override the event handlers to handle specific messages.
    virtual void OnKeyDown(UINT8 /*key*/)   {}
    virtual void OnKeyUp(UINT8 /*key*/)     {}

    // Accessors.
    [[nodiscard]] UINT GetWidth()   const   { return m_width; }
    [[nodiscard]] UINT GetHeight()  const   { return m_height; }
    [[nodiscard]] auto GetTitle()           { return m_title; }

    void ParseCommandLineArgs(_In_reads_(argc) WCHAR* argv[], int argc);
protected:
    std::wstring GetAssetFullPath(LPCWSTR assetName);

    void GetHardwareAdapter(_In_ IDXGIFactory1* pFactory, _Outptr_result_maybenull_ IDXGIAdapter1** ppAdapter, bool requestHighPerformanceAdapter = false);

    void SetCustomWindowText(LPCWSTR text);

    // Viewport dimensions.
    UINT m_width;
    UINT m_height;
    float m_aspectRatio;

    // Adapter info.
    bool m_useWarpDevice;

private:
    // Root assets path.
    std::wstring m_assetsPath;

    // Window title.
    std::wstring m_title;
};

#endif //CORE_H
