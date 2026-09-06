import Metal

/// Every mesh in the game, uploaded once and kept for the life of the program.
struct MeshRegistry {
    private var actors: [MeshID: GPUMesh] = [:]
    private var scenery: [SceneryID: GPUMesh] = [:]

    init(device: MTLDevice) {
        for id in MeshID.allCases    { actors[id]  = device.upload(id.mesh) }
        for id in SceneryID.allCases { scenery[id] = device.upload(id.mesh) }
    }

    subscript(id: MeshID) -> GPUMesh? { actors[id] }
    subscript(id: SceneryID) -> GPUMesh? { scenery[id] }
}
