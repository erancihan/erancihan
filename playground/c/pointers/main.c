#include <stdio.h>

void swap(int *a, int *b)
{
    int temp = *a; // Store the value at address 'a' in 'temp'
    *a = *b;       // Assign the value at address 'b' to address 'a'
    *b = temp;     // Assign the stored value in 'temp' to address 'b'
}

int main()
{
    int x = 10, y = 20;

    printf("%d %d\n", x, y);
    swap(&x, &y);
    printf("%d %d\n", x, y);

    return 0;
}
