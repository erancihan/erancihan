mod agent;

pub trait Movement {
    fn on_move(&self) -> ();
}

impl Movement for agent::Agent {
    fn on_move(&self) {
        println!("> moving");   
    }
}
