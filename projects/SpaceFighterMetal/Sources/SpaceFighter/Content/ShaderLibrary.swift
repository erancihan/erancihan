import Foundation
import Metal

enum ShaderLibraryError: Error {
    case missing(String)
}

/// Reads every shader file out of the resource bundle, glues them into one
/// translation unit, and hands it to the GPU's compiler.
enum ShaderLibrary {
    /// Concatenation order. The shared types must come first; after that the
    /// files are independent of each other.
    private static let files = [
        "ShaderTypes.metal", "lit.metal", "unlit.metal", "star.metal", "hud.metal",
    ]

    static func source() throws -> String {
        var source = "#include <metal_stdlib>\nusing namespace metal;\n"
        for name in files {
            guard
                let url = Bundle.module.url(
                    forResource: name, withExtension: nil, subdirectory: "Shaders"
                )
            else { throw ShaderLibraryError.missing(name) }

            source += "#line 1 \"\(name)\"\n"
            source += try String(contentsOf: url, encoding: .utf8)
                .split(separator: "\n", omittingEmptySubsequences: false)
                .map { $0.hasPrefix("#include") ? "" : String($0) }
                .joined(separator: "\n")
        }
        return source
    }

    static func make(device: MTLDevice) throws -> MTLLibrary {
        try device.makeLibrary(source: try source(), options: nil)
    }
}
