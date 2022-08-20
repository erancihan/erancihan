//
// Created by freedrone on 6.11.2020.
//

#ifndef WINDOW_RENDER_H
#define WINDOW_RENDER_H

#include <iostream>

#ifdef linux
#include <GL/glut.h>
#endif

#ifdef _WIN32
#include <d3d12.h>
#endif

class WindowRender
{
public:
    const char *title = "Rendering Graphics";
    void (*display)() = nullptr;

    void Create(int argc, char **argv) const;
    void Loop();
};

#endif //WINDOW_RENDER_H
