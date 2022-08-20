#include "src/WindowRenderer/WindowRender.h"

void display()
{
#ifdef linux
    glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT);

    // Draw a Red 1x1 Square centered at origin
    glBegin(GL_QUADS);              // Each set of 4 vertices form a quad
    glColor3f(1.0f, 0.0f, 0.0f); // Red
    glVertex2f(-0.5f, -0.5f);    // x, y
    glVertex2f(0.5f, -0.5f);
    glVertex2f(0.5f, 0.5f);
    glVertex2f(-0.5f, 0.5f);
    glEnd();

    glFlush();  // Render now
#endif
}

int main(int argc, char **argv)
{
#ifdef linux
    const char *window_title = "OpenGL Setup Test";
#endif
#ifdef _WIN32
    const char *window_title = "DirectX12 Setup Test";
#endif

    WindowRender window;

    window.title = window_title;
    window.display = display;

    window.Create(argc, argv);
    window.Loop();

    return 0;
}
