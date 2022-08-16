pub fn is_palindrome(x: i32) -> bool {
    let mut n: i32 = x;
    let mut reversed: i32 = 0;

    while n > 0 {
        reversed = reversed*10 + (n % 10);
        n = n / 10;
    }

    return x == reversed;
}

fn main() {
    let _a = is_palindrome(121);
    println!("{:?}", _a);

    let _b = is_palindrome(-121);
    println!("{:?}", _b);

    let _c = is_palindrome(10);
    println!("{:?}", _c);
}
