trait Broadcast {
    fn path(&self) -> vec![];

    fn on_broadcast(&self) -> ();
}
