#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/fcntl.h>

int main()
{
    int fd = open("test.txt", O_CREAT | O_WRONLY, 0644);
    if (fd == -1)
    {
        perror("open");
        return -1;
    }

    char *a_buf = "some data\n";
    write(fd, a_buf, strlen(a_buf));

    return 0;
}