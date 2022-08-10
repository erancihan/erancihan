trait Quack {
    fn quack(&self) -> ();
}

struct Duck ();

impl Quack for Duck {
    fn quack(&self) {
        println!("quack");
    }
}

struct Bird {
    is_a_parrot: bool
}

impl Quack for Bird {
    fn quack(&self) {
        if ! self.is_a_parrot {
            println!("quack!");
        } else {
            println!("squawk!");
        }
    }
}

fn main() {
    let duck1 = Duck();
    let bird1 = Bird{is_a_parrot: false};
    let bird2 = Bird{is_a_parrot: true };

    let _vec: Vec<&dyn Quack> = vec![&duck1, &bird1, &bird2];

    for item in &_vec {
        item.quack();
    }
}
