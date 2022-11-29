/**
 * Given a sorted array of distinct integers and a target value, 
 * return the index if the target is found. 
 * If not, return the index where it would be if it were inserted in order.
 */
pub fn search_insert(nums: Vec<i32>, target: i32) -> i32 {
    let mut resp = nums.len();

    for (pos, el) in nums.iter().enumerate() {
        if el.ge(&target) {
            resp = pos;
            break;
        }
    }

    resp as i32
}

fn main() {
    let a1 = search_insert([1,3,5,6].to_vec(), 5);
    println!("::{}", a1);

    let a2 = search_insert([1,3,5,6].to_vec(), 2);
    println!("::{}", a2);

    let a3 = search_insert([1,3,5,6].to_vec(), 7);
    println!("::{}", a3);
}
