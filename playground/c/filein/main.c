#include <stdio.h>
#include <unistd.h>
#include <sys/fcntl.h>
#include <sys/stat.h>

struct database_header
{
    unsigned short version;
    unsigned short employees;
    unsigned int filelength;
};

int main()
{
    int fd_db = open("./my-db.db", O_RDONLY);
    if (fd_db == -1)
    {
        perror("open");
        return -1;
    }

    struct database_header header = {0};

    read(fd_db, &header, sizeof(header));
    printf("Version: %d\n", header.version);

    struct stat db_stat = {0};
    if (fstat(fd_db, &db_stat) < 0)
    {
        perror("fstat");
        close(fd_db);

        return -1;
    }
    if (db_stat.st_size != header.filelength)
    {
        printf("File length mismatch\n");
        close(fd_db);

        return -1;
    }

    close(fd_db);

    return 0;
}
