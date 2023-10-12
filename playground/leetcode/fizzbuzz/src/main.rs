pub fn fizz_buzz(n: i32) -> Vec<String> {
    let mut res: Vec<String> = vec![String::new(); n as usize];
    for i in 1..(n + 1) {
        res[i as usize - 1] = match (i % 3, i % 5) {
            (0, 0) => "FizzBuzz".to_string(),
            (0, _) => "Fizz".to_string(),
            (_, 0) => "Buzz".to_string(),
            (_, _) => i.to_string(),
        };
    }

    res
}

fn main() {
    let out = fizz_buzz(15);
    println!("{:?}", out);
}
