pub mod movement {
}

pub trait Movement {
    fn name(&self) -> &str;

    fn on_move(&self) -> () {
        println!("> '{}' moving", self.name());   
    }
}
