mod agent;
use crate::agent::movement::Movement;

trait Broadcast {
    fn on_broadcast(&self) -> ();
}


fn main() {
    let agent = agent::Agent{};
    agent.on_move();
}
