pub fn longest_common_prefix_v1(strs: Vec<String>) -> String {
    if strs.len() == 0 {
        return "".to_string();
    }

    let mut comp = &strs[0];
    let mut match_size = comp.chars().count();

    for _str in strs.iter() {
        let _str_l = _str.chars().count();
        let mut match_c = 0; 
        for (i, _chr) in comp.chars().enumerate() {
            if i >= _str_l {
                break;
            }
            if i >= match_size {
                break;
            }
            if _str.chars().nth(i) != Some(_chr) {
                break;
            }
            match_c += 1;
        }
        match_size = match_c;
    }

    return comp.chars().take(match_size).collect();
}

pub fn longest_common_prefix_v2(strs: Vec<String>) -> String {
    let mut res: String = "".to_string();

    for (i, _chr) in strs[0].chars().enumerate() {
        for _str in strs.iter() {
            let _str_l = _str.chars().count();
            if i >= _str_l {
                return res;
            }
            if _str.chars().nth(i) != Some(_chr) {
                return res;
            }
        }

        res = format!("{}{}", res, &_chr);
    }

    return res;
}

fn main() {
    let _a = longest_common_prefix_v2(["flower","flow","flight"].iter().map(|&s|s.into()).collect());
    println!("{:?}", _a);

    let _b = longest_common_prefix_v2(["dog","racecar","car"].iter().map(|&s|s.into()).collect());
    println!("{:?}", _b);

    let _c = longest_common_prefix_v2(["ab","a"].iter().map(|&s|s.into()).collect());
    println!("{:?}", _c);
}
