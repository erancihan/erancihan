#include <stdio.h>
#include <sys/fcntl.h>

int main(int argc, char *argv[])
{
    int fd = open("./file-that-doesnt-exist", O_RDONLY);
    if (fd == -1)
    {
        perror("open");
        return -1;
    }
}
