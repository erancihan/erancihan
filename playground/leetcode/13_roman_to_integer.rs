use std::collections::HashMap;

fn key_to_val(key: char) -> Option<i32> {
    match key {
        'I' => Some(1),
        'V' => Some(5),
        'X' => Some(10),
        'L' => Some(50),
        'C' => Some(100),
        'D' => Some(500),
        'M' => Some(1000),
         _  => None,
    }
}

impl Solution {
    pub fn roman_to_int(s: String) -> i32 {
        let mut acc = 0;
        
        let mut prev: i32 = 0;
        for c in s.chars().rev() {
            let val: i32 = key_to_val(c).unwrap();
            if val >= prev {
                // current val is greater, incr
                prev = val;
                acc += val;
            } else {
                acc -= val;
            }            
        }
        
        return acc;
    }
}