pub fn length_of_last_word(s: String) -> i32 {
    let last = match s.trim_end().split_whitespace().last() {
        Some(value) => value,
        _ => ""
    };

    last.len() as i32
}

fn main() {
    let a = length_of_last_word(String::from("luffy is still joyboy"));
    println!("{}", a);

    let b = length_of_last_word(String::from("   fly me   to   the moon  "));
    println!("{}", b);

    let c = length_of_last_word(String::from("Hello World"));
    println!("{}", c);
}
