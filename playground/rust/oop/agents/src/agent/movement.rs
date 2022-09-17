pub mod movement {
}

pub trait Movement {
    fn on_move(&self) -> () {
        println!("> moving");   
    }
}
