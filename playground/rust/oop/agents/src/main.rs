mod agent;
use crate::agent::movement::Movement;


fn main() {
    let agent = agent::Agent{
        name: "My Agent"
    };
    agent.on_move();
}
