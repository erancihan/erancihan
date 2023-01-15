pub trait Movement2DBlock  {
    fn do_move(&self) -> () {
        println!("I'm moving in 2D");
    }
}
