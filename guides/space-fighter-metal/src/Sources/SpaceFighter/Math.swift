import Foundation   // for scalar tan() used in the perspective projection
import simd

// Small, self-contained linear-algebra helpers built on Apple's `simd`.
//
// Conventions used throughout the project:
//   * Right-handed world space. +X right, +Y up, +Z toward the viewer, so the
//     "forward" a ship faces is -Z in its own local space.
//   * Column-major 4x4 matrices (what Metal and `simd_float4x4` both expect),
//     so a transform is `M * v` and composition reads right-to-left:
//     `translate * rotate * scale`.
//   * Clip-space depth in [0, 1], the Metal convention (OpenGL used [-1, 1]).
//
// See `docs/03-the-math-you-need.md` for the derivations.

typealias Vec3 = SIMD3<Float>
typealias Vec4 = SIMD4<Float>
typealias Mat4 = simd_float4x4
typealias Quat = simd_quatf

extension Float {
    /// Degrees → radians. `simd` trig works in radians; designers think in degrees.
    var radians: Float { self * .pi / 180 }
}

enum Math {
    /// Identity transform.
    static let identity = matrix_identity_float4x4

    /// Translation matrix.
    static func translation(_ t: Vec3) -> Mat4 {
        Mat4(columns: (
            Vec4(1, 0, 0, 0),
            Vec4(0, 1, 0, 0),
            Vec4(0, 0, 1, 0),
            Vec4(t.x, t.y, t.z, 1)
        ))
    }

    /// Uniform scale matrix.
    static func scale(_ s: Float) -> Mat4 { scale(Vec3(repeating: s)) }

    /// Non-uniform scale matrix.
    static func scale(_ s: Vec3) -> Mat4 {
        Mat4(columns: (
            Vec4(s.x, 0, 0, 0),
            Vec4(0, s.y, 0, 0),
            Vec4(0, 0, s.z, 0),
            Vec4(0, 0, 0, 1)
        ))
    }

    /// Rotation matrix from a unit quaternion.
    ///
    /// We build it by hand from the quaternion's components rather than relying
    /// on a specific `simd_float4x4(quat)` initializer, so the code is obvious
    /// and portable across toolchains. `q.vector` is `(x, y, z, w)`.
    static func rotation(_ q: Quat) -> Mat4 {
        let x = q.vector.x, y = q.vector.y, z = q.vector.z, w = q.vector.w
        let xx = x * x, yy = y * y, zz = z * z
        let xy = x * y, xz = x * z, yz = y * z
        let wx = w * x, wy = w * y, wz = w * z
        return Mat4(columns: (
            Vec4(1 - 2 * (yy + zz), 2 * (xy + wz),     2 * (xz - wy),     0),
            Vec4(2 * (xy - wz),     1 - 2 * (xx + zz), 2 * (yz + wx),     0),
            Vec4(2 * (xz + wy),     2 * (yz - wx),     1 - 2 * (xx + yy), 0),
            Vec4(0, 0, 0, 1)
        ))
    }

    /// Compose a full model matrix: scale, then rotate, then translate.
    static func trs(translation t: Vec3, rotation r: Quat, scale s: Vec3) -> Mat4 {
        translation(t) * rotation(r) * scale(s)
    }

    /// Right-handed perspective projection with clip depth in [0, 1].
    ///
    /// `fovyRadians` is the *vertical* field of view; horizontal FOV follows
    /// from the aspect ratio. Objects nearer than `near` or beyond `far` are
    /// clipped.
    static func perspective(fovyRadians: Float, aspect: Float, near: Float, far: Float) -> Mat4 {
        let ys = 1 / tan(fovyRadians * 0.5)
        let xs = ys / aspect
        let zs = far / (near - far)
        return Mat4(columns: (
            Vec4(xs, 0, 0, 0),
            Vec4(0, ys, 0, 0),
            Vec4(0, 0, zs, -1),
            Vec4(0, 0, zs * near, 0)
        ))
    }

    /// Right-handed "look at" view matrix. `up` need not be exactly orthogonal
    /// to the view direction; it is re-orthogonalised here.
    static func lookAt(eye: Vec3, center: Vec3, up: Vec3) -> Mat4 {
        let z = simd_normalize(eye - center)   // camera looks down -z
        let x = simd_normalize(simd_cross(up, z))
        let y = simd_cross(z, x)
        return Mat4(columns: (
            Vec4(x.x, y.x, z.x, 0),
            Vec4(x.y, y.y, z.y, 0),
            Vec4(x.z, y.z, z.z, 0),
            Vec4(-simd_dot(x, eye), -simd_dot(y, eye), -simd_dot(z, eye), 1)
        ))
    }

    /// Move `current` toward `target` at up to `maxDelta` per call. Handy for
    /// easing throttle, camera and control rates without overshoot.
    static func moveToward(_ current: Float, _ target: Float, _ maxDelta: Float) -> Float {
        let d = target - current
        if abs(d) <= maxDelta { return target }
        return current + (d < 0 ? -maxDelta : maxDelta)
    }
}
