mod agent;
use agent::movement::behaviour::Movement2DBlock;


fn main() {
    let agent = agent::Agent {
        name: "My Agent",
        coordinates: agent::Coordinates { x: 0, y: 0 },
    };
    agent.do_move();
}
