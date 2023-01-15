mod agent;
use agent::Movement;


fn main() {
    let agent = agent::Agent{
        name: "My Agent"
    };
    agent.on_move();
}
