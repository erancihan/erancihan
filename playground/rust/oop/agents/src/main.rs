mod agent;

trait Broadcast {
    fn on_broadcast(&self) -> ();
}


fn main() {
    let agent = agent::Agent{};
    agent.on_move();
}
