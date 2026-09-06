/// Ages every Lifetime and destroys the expired. This is what stops bolts
/// accumulating forever.
enum LifetimeSystem {
    static func update(_ world: World, dt: Float) {
        let lifetimes = world.store(Lifetime.self)
        for entity in lifetimes.owners {
            lifetimes.mutate(entity) { $0.remaining -= dt }
            if let l = lifetimes.get(entity), l.remaining <= 0 {
                world.destroy(entity)
            }
        }
    }
}
