## LeetCode 941. Valid Mountain Array
[Link](https://leetcode.com/problems/valid-mountain-array/)

### Problem
Given an array of integers `arr`, return `true` if and only if it is a valid mountain array.
Arr is a mountain array if:
- `arr.length >= 3`
- There exists some `i` with `0 < i < arr.length - 1` such that:
  - `arr[0] < arr[1] < ... < arr[i - 1] < arr[i]`
  - `arr[i] > arr[i + 1] > ... > arr[arr.length - 1]`

### Solution approach
#### v0 (3ms, 2.2MB)
Check if the array is a mountain array by checking if the array is increasing and then decreasing.
We can do this by iterating through the array and comparing the current element with the next element.

Rust provides us with comparison operators that we can use to compare the elements.
```rust
let ok = match arr[i].cmp(&arr[i + 1]) {
    Ordering::Equal => false,
    Ordering::Less => ..., // increasing slope
    Ordering::Greater => ..., // decreasing slope
};
```

Noting that the array should always be increasing until the peak of the mountain is reached.
To track if the mountain has been increasing, we can use a boolean flag `upwards` to indicate that we are going up the mountain, and a boolean flag `downwards` to indicate that we are going down the mountain.
These flags cannot be true at the same time. When starting both flags are false.

- If both values are equal, we return false.
- If the current value is less than the next value, the mountain is on an increasing slope.
    - While going up the mountain, we set the `upwards` flag to true and the `downwards` flag to false.
    - Noting that both flags are false at the start, and should be increasing first, construct the if statement accordingly.
- If the current value is greater than the next value, the mountain is on a decreasing slope.
    - While going down the mountain, we set the `downwards` flag to true and the `upwards` flag to false.
    - Here, while going down the mountain, the `upwards` flag should be true, and the `downwards` flag should be false.

refer to the code for the implementation.

#### v1 (2ms >70.59%, 2.16MB >91.18%)
The above approach can be optimized by checking if the array is increasing and then decreasing in one pass.
We can do this by iterating through the array while the current element is smaller than the next element for the increasing slope.
Then, we iterate through the array while the current element is greater than the next element for the decreasing slope.

If the array is a mountain array, the increasing slope should be strictly increasing, and the decreasing slope should be strictly decreasing.

To do this, we can use two index pointers `i` and `j` to track the increasing and decreasing slopes, respectively. For the increasing slope, we start at the beginning of the array, and for the decreasing slope, we start at the end of the array.
At the end of the iteration, we check if the increasing and decreasing slopes have met at the peak of the mountain.    

refer to the code for the implementation.
