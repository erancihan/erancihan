#include <stdio.h>

union myunion {
    int i;
    char c;
};

int main() {
    union myunion u;

    u.i = 0x41424344;

    /**
     * The output depends on the endianness of the machine.
     * On a little-endian machine, the output will be:
     * 
     * u.i = 0x41424344
     * u.c = 0x44 (int)
     * u.c = D
     * 
     * On a big-endian machine, the output will be:
     * 
     * u.i = 0x41424344
     * u.c = 0x41 (int)
     * u.c = A
     * 
     * The output is the same as the input, but the interpretation of the
     * output is different.
     * This is because the union is a shared memory space, and the output
     * depends on the endianness of the machine.
     * int i and char c share the same memory space, so the output of one
     * will affect the output of the other.
     * 
     * int i is 4 bytes long, and char c is 1 byte long.
     * The output of char c is the last byte of int i. which is 0x44.
     * 
     * */

    printf("u.i = 0x%x\n", u.i);        // 0x41424344
    printf("u.c = 0x%x (int)\n", u.c);  // 0x44
    printf("u.c = %c\n", u.c);          // D

    return 0;
}
