pub trait Movement3DBlock  {
    fn do_move(&self) -> () {
        println!("I'm moving in 3D");
    }
}