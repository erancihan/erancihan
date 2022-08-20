/**
 * Valid Parantheses
 * 
 * To solve this problem, in this approach we use a `stack` to
 *   store the opening parantheses, and pop from the top of the
 *   stack as we encounter closing parantheses. 
 * 
 * In rust, we can use a vector to have the semantics of a stack.
 *  vec::push -> "Appends an element to the back of a collection."
 *  vec::pop  -> "Removes the last element from a vector and returns it, or None if it is empty."
 * 
 */

pub fn is_valid(s: String) -> bool {
    let mut vec: Vec<char> = Vec::new();

    // iter over input string
    for c in s.chars() {
        // if opening paranthesis, push to vector
        if c == '(' || c == '[' || c == '{' {
            vec.push(c);
            continue;
        }
        // if closing paranthesis, pop
        if c == ')' || c == ']' || c == '}' {
            // popped element must be the counterpart of `c`
            let ok = match vec.pop() {
                Some('(') => c == ')',
                Some('[') => c == ']',
                Some('{') => c == '}',
                _ => false,
            };

            // immediately break if not ok
            if !ok {
                return false;
            }
        }
        // else ignore
    }

    // stack size will be empty if all opened parentheses are closed
    return vec.len() == 0;
}

fn main() {
    let _a = is_valid("()".to_string());
    println!("()     : true  == {:?}", _a);

    let _b = is_valid("()[]{}".to_string());
    println!("()[]{{}} : true  == {:?}", _b);

    let _c = is_valid("(]".to_string());
    println!("(]     : false == {:?}", _c);

    let _d = is_valid("([)]".to_string());
    println!("([)]   : false == {:?}", _d);

    let _e = is_valid("[".to_string());
    println!("[      : false == {:?}", _e);

    let _f = is_valid("{ { } [ ] [ [ [ ] ] ] }".to_string());
    println!("       : true  == {:?}", _f);
}
