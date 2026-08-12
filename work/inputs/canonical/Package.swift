// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "SpaceFighter",
    platforms: [
        // Metal and the simd APIs we use predate this, but macOS 13 keeps the
        // code modern and matches a current Xcode toolchain.
        .macOS(.v13)
    ],
    targets: [
        .executableTarget(
            name: "SpaceFighter",
            path: "Sources/SpaceFighter"
        )
    ]
)
