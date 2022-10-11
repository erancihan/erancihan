use std::collections::{HashSet, HashMap};

/*
Given an integer array nums sorted in non-decreasing order,
 remove the duplicates in-place such that each unique element
 appears only once. 
 The relative order of the elements should be kept the same.

Since it is impossible to change the length of the array 
 in some languages, you must instead have the result be placed 
 in the first part of the array nums. More formally, if there 
 are k elements after removing the duplicates, then the 
 first k elements of nums should hold the final result.
 It does not matter what you leave beyond the first k elements.

Return k after placing the final result in the first k slots of nums.

Do not allocate extra space for another array. You must do this
 by modifying the input array in-place with O(1) extra memory.
 */
pub fn remove_duplicates_with_retain_set(nums: &mut Vec<i32>) -> i32 {
    let mut _set: HashSet<i32> = HashSet::new();

    nums.retain(|&elem| -> bool {
        match _set.get(&elem) {
            Some(_value) => {
                return false;
            },
            None => {
                _set.insert(elem);
                return true;
            }
        }
    });
    
    return nums.len() as i32;
}

pub fn remove_duplicates_with_retain_map(nums: &mut Vec<i32>, cap: i32) -> i32 {
    let mut _set: HashMap<i32, i32> = HashMap::new();

    nums.retain(|&elem| -> bool {
        match _set.get(&elem) {
            Some(val) => {
                let next = val + 1;
                if next > cap {
                    return false; // don't retain
                }

                _set.insert(elem, next);
                return true;
            },
            None => {
                _set.insert(elem, 1);
                return true;
            }
        }
    } );
    
    return nums.len() as i32;
}

pub fn remove_duplicates_with_retain_check_prev(nums: &mut Vec<i32>) -> i32 {
    let mut prev: i32 = i32::MIN;
    
    nums.retain(|&elem| -> bool {
        match elem == prev {
            true => false,
            false => {
                prev = elem;
                return true;
            }
        }
    });

    return nums.len() as i32;
}

pub fn remove_duplicates(nums: &mut Vec<i32>) -> i32 {
    // return remove_duplicates_with_retain_set(nums);
    return remove_duplicates_with_retain_map(nums, 1);
}

fn main() {
    let mut nums = vec![1, 1, 2];
    let expected_nums = vec![1, 2];

    // let mut nums = vec![1, 1, 3];
    // let expected_nums = vec![1, 2];

    let k = remove_duplicates(&mut nums);

    assert_eq!(k, expected_nums.len() as i32);
    for (index, value) in expected_nums.iter().enumerate() {
        assert_eq!(value, nums.get(index).unwrap());
    }

    println!("Done!")
}
