## LeetCode 28. Find the Index of the First Occurrence in a String
[Link](https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/description/)

### Problem
Self explanatory.

### Solution approach
#### v0 (0ms >100%, 2.10MB >18.36%)
... Rust provides a built-in method for this.
```rust
pub fn str_str(haystack: String, needle: String) -> i32 {
    match haystack.find(&needle) {
        Some(v) =>  v as i32,
        None => -1
    }
}
```
