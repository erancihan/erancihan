#include <iostream>
#include <d3d12.h>
#include <dxgi.h>
#include <d3dcompiler.h>
#include <DirectXMath.h>

#ifndef A_H
#define A_H

LRESULT CALLBACK    WndProc(HWND hWnd, UINT message, WPARAM wParam, LPARAM lParam);
int     WINAPI      WindowRun(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow);

#endif //A_H
