pub fn plus_one_v0(digits: Vec<i32>) -> Vec<i32> {
    let mut result: Vec<i32> = Vec::new();
    let mut carry = 1;

    for value in digits.iter().rev() {
        let next = value + carry;
        
        result.push(next % 10);
        carry = next / 10;
    }

    if carry > 0 {
        result.push(carry);
    }

    result.reverse();

    result
}

pub fn plus_one_v1(mut digits: Vec<i32>) -> Vec<i32> {
    let mut carry = 1;

    for index in (0..digits.len()).rev() {
        let next = digits[index] + carry;

        digits[index] = next % 10;
        carry = next / 10;
    }

    if carry > 0 {
        digits.push(carry);
        digits.rotate_right(1);
    }

    digits
}

fn main() {
    let a = plus_one_v0(vec![1, 2, 3]);
    println!("{:?}", a);
}
