#include <iostream>
#include <DXGI.h>
#include <vector>
#include <algorithm>

#pragma comment(lib , "DXGI.lib")

std::string WStringToString(const std::wstring &wstr)
{
    std::string str(wstr.length(), ' ');
    std::transform(wstr.begin(), wstr.end(), str.begin(), [](wchar_t c){
        return (char) c;
    });

    return str;
}

int print_graphics_cards_info()
{
    // parameter definition
    IDXGIFactory *pFactory;
    IDXGIAdapter *pAdapter;
    std::vector<IDXGIAdapter *> vAdapters; // graphics card
    int iAdapterNum = 0; // number of graphics cards

    // Create a DXGI factory
    HRESULT hr = CreateDXGIFactory(__uuidof(IDXGIFactory), (void **) (&pFactory));

    if (FAILED(hr))
    {
        return -1;
    }

    // enumeration adapter
    while (pFactory->EnumAdapters(iAdapterNum, &pAdapter) != DXGI_ERROR_NOT_FOUND)
    {
        vAdapters.push_back(pAdapter);
        ++iAdapterNum;
    }

    // Information output
    std::cout << "=============== Get to " << iAdapterNum << " block graphics card ===============" << std::endl;
    for (auto & vAdapter : vAdapters)
    {
        // getting information
        DXGI_ADAPTER_DESC adapterDesc;
        vAdapter->GetDesc(&adapterDesc);
        std::wstring aa(adapterDesc.Description);
        std::string bb = WStringToString(aa);
        // Output graphics card information
        std::cout << "Device Description    : " << bb.c_str() << std::endl;
        std::cout << "Vendor ID             : " << adapterDesc.VendorId << std::endl;
        std::cout << "Revision              : " << adapterDesc.Revision << std::endl;
        std::cout << "System Video Memory   : " << adapterDesc.DedicatedSystemMemory / 1024 / 1024 << "M" << std::endl;
        std::cout << "Dedicated Video Memory: " << adapterDesc.DedicatedVideoMemory / 1024 / 1024 << "M" << std::endl;
        std::cout << "Shared System Memory  : " << adapterDesc.SharedSystemMemory / 1024 / 1024 << "M" << std::endl;
        std::cout << std::endl;
    }
    vAdapters.clear();

    return 0;
}
