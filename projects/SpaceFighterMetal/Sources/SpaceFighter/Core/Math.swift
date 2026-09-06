import Foundation
import simd

typealias Vec3 = SIMD3<Float>
typealias Vec4 = SIMD4<Float>
typealias Mat4 = simd_float4x4
typealias Quat = simd_quatf

extension Float {
    var radians: Float { self * .pi / 180 }
}

enum Math {
    static let identity = matrix_identity_float4x4

    static func translation(_ t: Vec3) -> Mat4 {
        Mat4(
            columns: (
                Vec4(1, 0, 0, 0),
                Vec4(0, 1, 0, 0),
                Vec4(0, 0, 1, 0),
                Vec4(t.x, t.y, t.z, 1)
            ))
    }

    static func scale(_ s: Float) -> Mat4 { scale(Vec3(repeating: s)) }

    static func scale(_ s: Vec3) -> Mat4 {
        Mat4(
            columns: (
                Vec4(s.x, 0, 0, 0),
                Vec4(0, s.y, 0, 0),
                Vec4(0, 0, s.z, 0),
                Vec4(0, 0, 0, 1)
            ))
    }

    static func rotation(_ q: Quat) -> Mat4 {
        let x = q.vector.x
        let y = q.vector.y
        let z = q.vector.z
        let w = q.vector.w
        let xx = x * x
        let yy = y * y
        let zz = z * z
        let xy = x * y
        let xz = x * z
        let yz = y * z
        let wx = w * x
        let wy = w * y
        let wz = w * z
        return Mat4(
            columns: (
                Vec4(1 - 2 * (yy + zz), 2 * (xy + wz), 2 * (xz - wy), 0),
                Vec4(2 * (xy - wz), 1 - 2 * (xx + zz), 2 * (yz + wx), 0),
                Vec4(2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (xx + yy), 0),
                Vec4(0, 0, 0, 1)
            ))
    }

    static func trs(translation t: Vec3, rotation r: Quat, scale s: Vec3) -> Mat4 {
        translation(t) * rotation(r) * scale(s)
    }

    static func perspective(fovyRadians: Float, aspect: Float, near: Float, far: Float) -> Mat4 {
        let ys = 1 / tan(fovyRadians * 0.5)
        let xs = ys / aspect
        let zs = far / (near - far)
        return Mat4(
            columns: (
                Vec4(xs, 0, 0, 0),
                Vec4(0, ys, 0, 0),
                Vec4(0, 0, zs, -1),
                Vec4(0, 0, zs * near, 0)
            ))
    }

    static func lookAt(eye: Vec3, center: Vec3, up: Vec3) -> Mat4 {
        let z = simd_normalize(eye - center)
        let x = simd_normalize(simd_cross(up, z))
        let y = simd_cross(z, x)
        return Mat4(
            columns: (
                Vec4(x.x, y.x, z.x, 0),
                Vec4(x.y, y.y, z.y, 0),
                Vec4(x.z, y.z, z.z, 0),
                Vec4(-simd_dot(x, eye), -simd_dot(y, eye), -simd_dot(z, eye), 1)
            ))
    }

    static func moveToward(_ current: Float, _ target: Float, _ maxDelta: Float) -> Float {
        let d = target - current
        if abs(d) <= maxDelta {
            return target
        }

        return current + (d < 0 ? -maxDelta : maxDelta)
    }

    static func moveToward(_ current: Vec3, _ target: Vec3, _ maxDelta: Float) -> Vec3 {
        let d = target - current
        let dist = simd_length(d)
        if dist <= maxDelta {
            return target
        }

        return current + d * (maxDelta / dist)
    }
}
