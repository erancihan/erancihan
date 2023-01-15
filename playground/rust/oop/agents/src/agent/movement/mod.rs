pub mod behaviour;

use crate::agent::Coordinates;

pub trait Movement {
    fn name(&self) -> &str;

    fn current_coordinates(&self) -> &Coordinates;

    fn do_move(&self) -> ();
}
