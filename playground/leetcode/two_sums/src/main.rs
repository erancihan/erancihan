use std::collections::HashMap;
use std::vec::Vec;

pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
    let mut _dict: HashMap<i32, i32> = HashMap::new(); // value, index

    for (i, num) in nums.iter().enumerate() {
        let j = _dict.get(&(target - num)).cloned().unwrap_or(-1);
        if j != -1 {
            return [j, i as i32].to_vec();
        }

        _dict.insert(*num, i as i32);
    }

    return [].to_vec();
}

fn main() {
    let _a = two_sum([2,7,11,15].to_vec(), 9);
    println!("{:?}", _a);

    let _b = two_sum([3,2,4].to_vec(), 6);
    println!("{:?}", _b);

    let _c = two_sum([3,3].to_vec(), 6);
    println!("{:?}", _c);
}
