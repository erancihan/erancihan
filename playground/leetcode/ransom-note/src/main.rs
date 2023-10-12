pub fn can_construct(ransom_note: String, magazine: String) -> bool {
    let mut bag = [0; 26];
    for ch in ransom_note.chars() {
        let idx = (ch as u32) - 97;
        bag[idx as usize] += 1;
    }

    for ch in magazine.chars() {
        let idx = (ch as u32) - 97;
        bag[idx as usize] -= 1;
    }

    for val in bag {
        if val > 0 {
            return false;
        }
    }

    true
}

fn main() {
    if can_construct("aa".to_string(), "ab".to_string()) {
        println!("Can construct");
    } else {
        println!("Cannot construct");
    }

    if can_construct("aa".to_string(), "aab".to_string()) {
        println!("Can construct");
    } else {
        println!("Cannot construct");
    }
}
