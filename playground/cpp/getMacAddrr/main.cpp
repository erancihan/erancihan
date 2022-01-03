#define WIN32_LEAN_AND_MEAN

#include <format>
#include <iostream>
#include <string>
#include <string_view>
#include <map>
#include <cstdio>

#include <Windows.h>
#include <WinSock2.h>

#pragma comment(lib, "WS2_32")

#include <iphlpapi.h>
#pragma comment(lib, "IPHLPAPI.lib")


std::map<std::string, std::string> RetrieveLocalMacAddresses(ULONG ulFlags, ULONG ulFamily)
{
    std::map<std::string, std::string> _map;

    PIP_ADAPTER_ADDRESSES pAddresses = NULL;

    DWORD dwRetVal = 0;
    ULONG ulBufLen = sizeof(IP_ADAPTER_ADDRESSES);
    HANDLE hHeap = NULL;

    hHeap = GetProcessHeap();
    pAddresses = (PIP_ADAPTER_ADDRESSES) HeapAlloc(hHeap, 0x00, ulBufLen);
    if (pAddresses == NULL) {
        return _map;
    }

    dwRetVal = GetAdaptersAddresses(ulFamily, ulFlags, NULL, pAddresses, &ulBufLen);
    if (dwRetVal == ERROR_BUFFER_OVERFLOW) {
        HeapFree(hHeap, 0x00, pAddresses);
        pAddresses = (PIP_ADAPTER_ADDRESSES) HeapAlloc(hHeap, 0x00, ulBufLen);
    }

    if (pAddresses == NULL) {
        return _map;
    }

    dwRetVal = GetAdaptersAddresses(ulFamily, ulFlags, NULL, pAddresses, &ulBufLen);
    if (dwRetVal != NO_ERROR) {
        return _map;
    }

    while (pAddresses) {
        std::wstring wFriendlyName(pAddresses->FriendlyName);
        std::wstring_convert<std::codecvt<wchar_t, char, mbstate_t>> convert;
        std::string strFriendlyName = convert.to_bytes(wFriendlyName);

        auto pa = pAddresses->PhysicalAddress;
        _map.insert(
            std::make_pair(
                strFriendlyName,
                std::format(
                    "{:02X}-{:02X}-{:02X}-{:02X}-{:02X}-{:02X}-{:02X}-{:02X}",
                    pa[0], pa[1], pa[2], pa[3], pa[4], pa[5], pa[6], pa[7]
                )
            )
        );

        pAddresses = pAddresses->Next;
    }

    return _map;
}

void run()
{
    auto data = RetrieveLocalMacAddresses(GAA_FLAG_INCLUDE_ALL_COMPARTMENTS, AF_UNSPEC);
    for (const auto& [key, value] : data) {
        std::cout << std::format("{{ {:35s}, {} }}", key, value) << "\n";
    }
    std::cout << std::endl;
}

int main()
{
    run();

    return 0;
}
