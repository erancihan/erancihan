pub mod movement;

pub mod coordinates;
pub use coordinates::Coordinates;

use self::movement::{
    behaviour::{Movement2DBlock, Movement3DBlock},
    Movement,
};

pub struct Agent<'lt> {
    pub name: &'lt str,
    pub coordinates: Coordinates,
}

impl Movement for Agent<'_> {
    fn name(&self) -> &str {
        self.name
    }

    fn current_coordinates(&self) -> &Coordinates {
        &self.coordinates
    }

    fn do_move(&self) -> () {
        todo!()
    }
}

impl Movement2DBlock for Agent<'_> {}

impl Movement3DBlock for Agent<'_> {}
