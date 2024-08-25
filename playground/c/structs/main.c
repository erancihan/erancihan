#include <stdio.h>

struct struct_a {
    int i;
    char c;
};

struct __attribute__((packed)) struct_b
{
    int i;
    char c;
};

struct Person {
    char* name;
    int age;
};

int main(int argc, char const *argv[])
{
    struct struct_a a;
    struct struct_b b;

    // print the size of the struct
    printf("sizeof(struct_a) = %lu\n", sizeof(a)); // 8
    printf("sizeof(struct_b) = %lu\n", sizeof(b)); // 5

    struct Person person = {
        // name: "John", // warning: use of GNU old-style field designator extension [-Wgnu-designator]
        .name = "John",
        .age = 30
    };
    
    printf("Name: %s\n", person.name);
    printf("Age: %d\n", person.age);

    return 0;
}
