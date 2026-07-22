// swift-tools-version:5.9
import PackageDescription

// A single macOS executable. Everything (the ECS, the Metal renderer, the game)
// lives in one target to keep the project easy to read end-to-end. Metal,
// MetalKit and AppKit are system frameworks on macOS, so they need no explicit
// dependency here — `import Metal` just works.
let package = Package(
    name: "SpaceFighter",
    platforms: [
        // Metal + the simd APIs we use are available well before this, but 13
        // keeps the code modern (and matches a current Xcode toolchain).
        .macOS(.v13)
    ],
    targets: [
        .executableTarget(
            name: "SpaceFighter",
            path: "Sources/SpaceFighter"
        )
    ]
)
