//
// Created by freedrone on 6.11.2020.
//

#ifdef linux

// includes
#include "WindowRender.h"

#ifndef WINDOW_RENDER_CPP
#define WINDOW_RENDER_CPP

void WindowRender::Create(int argc, char **argv) const
{
    // Init GLUT
    glutInit(&argc, argv);

    // Create a window with title
    glutCreateWindow(title);
    glutInitWindowSize(320, 320);
    glutInitWindowPosition(50, 50);

    glutDisplayFunc(display);
}

#pragma clang diagnostic push
#pragma ide diagnostic ignored "readability-convert-member-functions-to-static"
void WindowRender::Loop()
{
    glutMainLoop();
}
#pragma clang diagnostic pop

#endif // WINDOW_RENDER_CPP

#endif // linux
