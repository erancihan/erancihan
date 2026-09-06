/// Walks every entity with both a Transform and a Renderable, bakes its model
/// matrix, and buckets the results by mesh so the renderer can draw each mesh in
/// a single instanced call.
enum SceneSystem {
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
