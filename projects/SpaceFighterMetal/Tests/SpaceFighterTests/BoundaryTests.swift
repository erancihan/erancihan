import Foundation
import Testing

/// The layer rules from chapter 02, enforced by reading the source.
///
/// Inside a single module Swift has no way to say "this directory may not see
/// that one", so we say it here instead. These two tests are the whole
/// enforcement mechanism for the architecture, and they cost about a
/// millisecond.

/// Package root, derived from this file's own location.
private let packageRoot = URL(fileURLWithPath: #filePath)
    .deletingLastPathComponent()  // SpaceFighterTests
    .deletingLastPathComponent()  // Tests
    .deletingLastPathComponent()  // SpaceFighter

private func swiftFiles(under relativePath: String) -> [URL] {
    let root = packageRoot.appending(path: relativePath)
    guard let walker = FileManager.default.enumerator(at: root, includingPropertiesForKeys: nil)
    else { return [] }
    return walker.compactMap { $0 as? URL }.filter { $0.pathExtension == "swift" }
}

/// Gameplay vocabulary. `Render/` is allowed `Mesh`, `MeshID`, `Vertex`,
/// `InstanceData` and friends — geometry and ids are not gameplay.
private let gameplayNames = [
    "World", "Entity", "ComponentStore",
    "Transform", "Velocity", "Renderable", "Collider",
    "Player", "Enemy", "Weapon", "Projectile", "Archetype",
]

@Test func renderLayerKnowsNothingAboutTheGame() throws {
    for file in swiftFiles(under: "Sources/SpaceFighter/Render") {
        let source = try String(contentsOf: file, encoding: .utf8)
        for name in gameplayNames {
            #expect(
                !source.contains(name),
                "\(file.lastPathComponent) mentions \(name) — gameplay leaked into Render/"
            )
        }
    }
}

@Test func gameplayNeverTouchesMetal() throws {
    let directories = [
        "Sources/SpaceFighter/Components",
        "Sources/SpaceFighter/Systems",
        "Sources/SpaceFighter/Archetypes",
        "Sources/SpaceFighter/Content/Meshes",
    ]
    for directory in directories {
        for file in swiftFiles(under: directory) {
            let source = try String(contentsOf: file, encoding: .utf8)
            #expect(
                !source.contains("import Metal") && !source.contains("MTL"),
                "\(file.lastPathComponent) reaches for Metal — that belongs in Render/"
            )
        }
    }
}
