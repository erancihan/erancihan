pub mod movement;
pub use movement::Movement;


pub struct Agent<'lt> {
    pub name: &'lt str,
}    

impl Movement for Agent<'_> {
    fn name(&self) -> &str {
        self.name
    }
}
