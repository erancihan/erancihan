/// Counts down every `Lifetime` and destroys entities whose fuse runs out. This
/// is what keeps bolts from flying forever. Destruction is deferred by the
/// `World`, so it's safe to call `destroy` while iterating here.
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
