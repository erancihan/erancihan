/// The bridge from the ECS to the renderer. It walks every entity that has both
/// a `Transform` and a `Renderable`, bakes its model matrix, and buckets the
/// result by mesh so the renderer can draw each mesh in a single instanced call.
///
/// Notice the renderer never sees an entity, a component, or a system — only
/// arrays of `InstanceData`. That clean seam is what lets you swap the whole
/// rendering backend without touching gameplay.
enum RenderSystem {
    static func buildInstances(_ world: World) -> [MeshID: [InstanceData]] {
        let transforms = world.store(Transform.self)
        let renderables = world.store(Renderable.self)

        var byMesh: [MeshID: [InstanceData]] = [:]
        for entity in renderables.owners {
            guard let r = renderables.get(entity), let t = transforms.get(entity) else { continue }
            byMesh[r.mesh, default: []].append(InstanceData(model: t.matrix, color: r.color))
        }
        return byMesh
    }
}
