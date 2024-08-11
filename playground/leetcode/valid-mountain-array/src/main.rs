pub fn valid_mountain_array_v1(arr: Vec<i32>) -> bool {
    let mut i = 0;
    let mut j = arr.len() - 1; 

    while i + 1 < arr.len() && arr[i] < arr[i+1] {
        // while left side is valid
        i += 1;
    }

    while j > 0 && arr[j-1] > arr[j] {
        // while right side is valid
        j -= 1;
    }

    i > 0 && i == j && j < arr.len() - 1
}

pub fn valid_mountain_array_v0(arr: Vec<i32>) -> bool {
    if arr.len() < 3 {
        return false;
    }

    let mut upwards = false;
    let mut downwards = false;

    for i in 0..arr.len()-1 {
        // check comparison
        let ok = match arr[i].cmp(&arr[i+1]) {
            std::cmp::Ordering::Equal => {
                // fail
                false
            },
            std::cmp::Ordering::Less => {
                // a < b : increasing slope
                // it should be increasing but not decreasing
                // cannot recieve inceasing if `is_decreasing`
                
                if !upwards && !downwards {
                    // both has to be false for first time
                    // and first time should be upwards
                    upwards = true;
                    downwards = false;
                }

                upwards && !downwards
            },
            std::cmp::Ordering::Greater => {
                // a > b : decreasing slope
                // should be downwards slope, upwards should have been true
                if upwards && !downwards {
                    upwards = false;
                    downwards = true;
                }
                // should be strictly downwards
                !upwards && downwards 
            },
        };
        if !ok {
            return false;
        }
    }

    !upwards && downwards
}

fn main() {
    let res = valid_mountain_array_v1(vec![0, 3, 2, 1]);
    println!("{:}", res);
}
