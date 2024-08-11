pub fn str_str(haystack: String, needle: String) -> i32 {
    match haystack.find(&needle) {
        Some(v) =>  v as i32,
        None => -1
    }
}

fn main() {
    let res = str_str("mississippi".to_string(), "issipi".to_string());
    println!("{}", res);
}
