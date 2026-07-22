import Foundation

/// An entity is just an identity — a number. It owns no data and has no
/// behaviour. Everything an entity *is* (a ship, a bullet, an enemy) comes from
/// the components attached to it in the `World`, and everything it *does* comes
/// from the systems that run over those components.
///
/// We use a plain incrementing `UInt32`. Real engines fold a *generation* count
/// into the id so that a recycled slot can be told apart from the entity that
/// used to live there; we skip that here for clarity and simply never reuse an
/// id. See `docs/04-designing-the-ecs.md` for how generations work and why
/// you'd add them.
struct Entity: Hashable {
    let id: UInt32
}
