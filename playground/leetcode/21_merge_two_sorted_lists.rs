// Definition for singly-linked list.
#[derive(PartialEq, Eq, Clone, Debug)]
pub struct ListNode {
  pub val: i32,
  pub next: Option<Box<ListNode>>
}

impl ListNode {
  #[inline]
  fn new(val: i32) -> Self {
    ListNode {
      next: None,
      val
    }
  }
}

pub fn merge_two_lists(list1: Option<Box<ListNode>>, list2: Option<Box<ListNode>>) -> Option<Box<ListNode>> {
    let mut merged = Box::new(ListNode::new(0));
    let mut cursor = &mut merged;

    let mut l1_cursor = list1;
    let mut l2_cursor = list2;

    while l1_cursor.is_some() && l2_cursor.is_some() {
        let l1_val = l1_cursor.as_ref().unwrap().val;
        let l2_val = l2_cursor.as_ref().unwrap().val;

        if l1_val < l2_val {
            // `move` tail of `l1`
            // `move` head of `l1` as cursor's next value
            // move l1 cursor to tail
            let tail = l1_cursor.as_mut().unwrap().next.take();
            cursor.next = l1_cursor;
            l1_cursor = tail;
        } else {
            let tail = l2_cursor.as_mut().unwrap().next.take();
            cursor.next = l2_cursor;
            l2_cursor = tail;
        }

        // move cursor to next
        cursor = cursor.next.as_mut().unwrap();
    }

    // one of them became None, append rest
    if l1_cursor.is_none() || l2_cursor.is_none() {
        cursor.next = if l1_cursor.is_some() { l1_cursor } else { l2_cursor };
    } 

    return merged.next;
}

fn main() {
}
